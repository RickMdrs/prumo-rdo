-- =============================================================================
-- Prumo RDO — 011: painel do Master e histórico de auditoria
--
-- As duas funções são SECURITY INVOKER de propósito: rodam com as permissões
-- de quem chama, então a RLS decide o que entra na conta. Um Master só soma
-- as próprias obras; ninguém além do Master lê a auditoria.
-- =============================================================================

create or replace function painel_master()
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with hoje as (
    select (now() at time zone 'America/Fortaleza')::date as d
  ),
  semana as (
    select date_trunc('week', (select d from hoje))::date as inicio
  ),
  obras_ativas as (
    select id, nome, inicio from obras where ativa
  ),
  -- Dias úteis dos últimos 14 dias, até ontem: hoje ainda está em andamento.
  dias_uteis as (
    select g::date as dia
    from generate_series((select d from hoje) - 14, (select d from hoje) - 1, interval '1 day') g
    where extract(isodow from g) < 6
  ),
  faltando as (
    select o.id as obra_id, o.nome, du.dia
    from obras_ativas o
    cross join dias_uteis du
    where (o.inicio is null or du.dia >= o.inicio)
      and not exists (
        select 1 from rdos r
        where r.obra_id = o.id and r.data = du.dia and r.status <> 'cancelado'
      )
  )
  select jsonb_build_object(
    'contadores', jsonb_build_object(
      'para_analisar', (select count(*) from rdos where status in ('submetido', 'em_analise')),
      'devolvidos', (select count(*) from rdos where status = 'rascunho' and devolucao_motivo is not null),
      'aguardando_cliente', (select count(*) from rdos where status = 'enviado_cliente'),
      'finalizados', (select count(*) from rdos where status = 'finalizado')
    ),
    'atrasados', coalesce((
      select jsonb_agg(jsonb_build_object(
        'obra_id', obra_id,
        'obra', nome,
        'dias', qtd,
        'ultimos', ultimos
      ) order by qtd desc)
      from (
        select obra_id, nome, count(*) as qtd,
               (array_agg(dia order by dia desc))[1:5] as ultimos
        from faltando
        group by obra_id, nome
      ) a
    ), '[]'::jsonb),
    'hh_semana', coalesce((
      select jsonb_agg(jsonb_build_object('obra_id', obra_id, 'obra', nome, 'hh', hh) order by hh desc)
      from (
        select o.id as obra_id, o.nome, sum(m.quantidade * m.horas) as hh
        from obras_ativas o
        join rdos r on r.obra_id = o.id
        join rdo_mao_obra m on m.rdo_id = r.id
        where r.data >= (select inicio from semana)
          and r.status not in ('cancelado', 'retificado')
        group by o.id, o.nome
      ) h
    ), '[]'::jsonb),
    'semana_inicio', (select inicio from semana)
  );
$$;

-- Histórico de um RDO: as linhas dele e as das tabelas filhas.
create or replace function rdo_auditoria(p_rdo_id uuid)
returns table (
  id bigint,
  quando timestamptz,
  acao text,
  tabela text,
  ator text,
  antes jsonb,
  depois jsonb
)
language sql
stable
security invoker
set search_path = public
as $$
  select a.id, a.created_at, a.acao, a.tabela, coalesce(p.nome, 'Sistema'), a.antes, a.depois
  from auditoria a
  left join perfis p on p.id = a.ator_id
  where a.registro_id = p_rdo_id
     or (a.depois ->> 'rdo_id')::uuid = p_rdo_id
     or (a.antes ->> 'rdo_id')::uuid = p_rdo_id
  order by a.id;
$$;

create index if not exists auditoria_rdo_depois_idx on auditoria (((depois ->> 'rdo_id')));

revoke execute on function painel_master() from anon;
revoke execute on function rdo_auditoria(uuid) from anon;
grant execute on function painel_master() to authenticated;
grant execute on function rdo_auditoria(uuid) to authenticated;
