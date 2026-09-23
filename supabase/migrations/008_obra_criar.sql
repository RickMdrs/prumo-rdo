-- =============================================================================
-- Prumo RDO — 008: criação de obra por função
--
-- Um INSERT direto com RETURNING esbarra na própria RLS: o Postgres aplica a
-- política de leitura à linha nova antes do trigger AFTER INSERT vincular o
-- criador como membro. A função faz as duas coisas numa transação e devolve a
-- obra já visível para quem a criou.
-- =============================================================================

create or replace function obra_criar(
  p_nome text,
  p_endereco text,
  p_contrato text,
  p_cliente_nome text,
  p_inicio date,
  p_fim_previsto date
)
returns obras
language plpgsql
security definer
set search_path = public
as $$
declare
  v_empresa uuid;
  v_obra obras;
begin
  if auth.uid() is null then
    raise exception 'Sessão não identificada. Entre novamente no aplicativo.'
      using errcode = 'P0001';
  end if;

  if not fn_eh_master_da_empresa() then
    raise exception 'Somente o responsável técnico cadastra obras.' using errcode = 'P0001';
  end if;

  if coalesce(trim(p_nome), '') = '' then
    raise exception 'Informe o nome da obra.' using errcode = 'P0001';
  end if;

  if p_inicio is not null and p_fim_previsto is not null and p_fim_previsto < p_inicio then
    raise exception 'A previsão de término não pode ser antes do início.' using errcode = 'P0001';
  end if;

  v_empresa := fn_empresa_do_usuario();

  insert into obras (empresa_id, nome, endereco, contrato, cliente_nome, inicio, fim_previsto)
  values (
    v_empresa,
    trim(p_nome),
    nullif(trim(coalesce(p_endereco, '')), ''),
    nullif(trim(coalesce(p_contrato, '')), ''),
    nullif(trim(coalesce(p_cliente_nome, '')), ''),
    p_inicio,
    p_fim_previsto
  )
  returning * into v_obra;

  -- O trigger trg_obras_vincula_criador já vincula; o on conflict mantém a
  -- função correta mesmo se o trigger for removido um dia.
  insert into obra_membros (obra_id, usuario_id, papel)
  values (v_obra.id, auth.uid(), 'master')
  on conflict do nothing;

  return v_obra;
end;
$$;

revoke execute on function obra_criar(text, text, text, text, date, date) from anon;
grant execute on function obra_criar(text, text, text, text, date, date) to authenticated;
