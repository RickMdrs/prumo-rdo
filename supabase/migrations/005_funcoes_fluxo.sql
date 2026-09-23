-- =============================================================================
-- Prumo RDO — 005: funções de fluxo (RPC)
--
-- Toda transição de estado passa por aqui. São SECURITY DEFINER (portanto
-- ignoram RLS) e por isso checam explicitamente auth.uid(), o papel na obra e
-- o status atual. É a regra 6 da seção 4.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Auxiliares
-- -----------------------------------------------------------------------------

create or replace function fn_notificar(
  p_usuario_id uuid,
  p_rdo_id uuid,
  p_tipo text,
  p_titulo text,
  p_corpo text
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into notificacoes (usuario_id, rdo_id, tipo, titulo, corpo)
  values (p_usuario_id, p_rdo_id, p_tipo, p_titulo, p_corpo);
$$;

create or replace function fn_notificar_papel(
  p_obra_id uuid,
  p_papel papel_usuario,
  p_rdo_id uuid,
  p_tipo text,
  p_titulo text,
  p_corpo text
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into notificacoes (usuario_id, rdo_id, tipo, titulo, corpo)
  select m.usuario_id, p_rdo_id, p_tipo, p_titulo, p_corpo
  from obra_membros m
  join perfis p on p.id = m.usuario_id
  where m.obra_id = p_obra_id
    and m.papel = p_papel
    and p.ativo
    and m.usuario_id <> coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid);
$$;

-- Fotografia completa do RDO, congelada em rdo_versoes no momento da validação.
create or replace function fn_rdo_snapshot(p_rdo_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'rdo', to_jsonb(r),
    'obra', to_jsonb(o),
    'autor', jsonb_build_object('id', a.id, 'nome', a.nome, 'email', a.email),
    'clima', coalesce((select jsonb_agg(to_jsonb(c) order by c.periodo)
                       from rdo_clima c where c.rdo_id = r.id), '[]'::jsonb),
    'mao_obra', coalesce((select jsonb_agg(to_jsonb(m) order by m.created_at)
                          from rdo_mao_obra m where m.rdo_id = r.id), '[]'::jsonb),
    'equipamentos', coalesce((select jsonb_agg(to_jsonb(e) order by e.created_at)
                              from rdo_equipamentos e where e.rdo_id = r.id), '[]'::jsonb),
    'atividades', coalesce((select jsonb_agg(to_jsonb(t) order by t.created_at)
                            from rdo_atividades t where t.rdo_id = r.id), '[]'::jsonb),
    'ocorrencias', coalesce((select jsonb_agg(to_jsonb(oc) order by oc.created_at)
                             from rdo_ocorrencias oc where oc.rdo_id = r.id), '[]'::jsonb),
    'pendencias', coalesce((select jsonb_agg(to_jsonb(pd) order by pd.created_at)
                            from rdo_pendencias pd where pd.rdo_id = r.id), '[]'::jsonb),
    'fotos', coalesce((select jsonb_agg(to_jsonb(f) order by f.created_at)
                       from rdo_fotos f where f.rdo_id = r.id), '[]'::jsonb),
    'comentarios', coalesce((select jsonb_agg(to_jsonb(cm) order by cm.created_at)
                             from comentarios cm where cm.rdo_id = r.id), '[]'::jsonb),
    'assinaturas', coalesce((select jsonb_agg(to_jsonb(asg) order by asg.created_at)
                             from assinaturas asg where asg.rdo_id = r.id), '[]'::jsonb),
    'congelado_em', now()
  )
  from rdos r
  join obras o on o.id = r.obra_id
  join perfis a on a.id = r.autor_id
  where r.id = p_rdo_id;
$$;

-- Carrega o RDO garantindo que o chamador é membro da obra.
create or replace function fn_exige_membro(p_rdo_id uuid)
returns rdos
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_rdo rdos;
begin
  if auth.uid() is null then
    raise exception 'Sessão não identificada. Entre novamente no aplicativo.'
      using errcode = 'P0001';
  end if;

  select * into v_rdo from rdos where id = p_rdo_id;

  if v_rdo.id is null then
    raise exception 'RDO não encontrado.' using errcode = 'P0001';
  end if;

  if not fn_eh_membro(v_rdo.obra_id) then
    raise exception 'Você não está vinculado à obra deste RDO.' using errcode = 'P0001';
  end if;

  return v_rdo;
end;
$$;

-- -----------------------------------------------------------------------------
-- rdo_criar — numeração sequencial por obra, com lock na linha da obra
-- -----------------------------------------------------------------------------

create or replace function rdo_criar(p_obra_id uuid, p_data date, p_turno turno)
returns rdos
language plpgsql
security definer
set search_path = public
as $$
declare
  v_papel papel_usuario;
  v_obra obras;
  v_numero integer;
  v_rdo rdos;
begin
  if auth.uid() is null then
    raise exception 'Sessão não identificada. Entre novamente no aplicativo.'
      using errcode = 'P0001';
  end if;

  v_papel := fn_papel_na_obra(p_obra_id);

  if v_papel is null then
    raise exception 'Você não está vinculado a esta obra.' using errcode = 'P0001';
  end if;

  if v_papel = 'cliente' then
    raise exception 'O Cliente não cria RDO.' using errcode = 'P0001';
  end if;

  -- O lock serializa duas criações simultâneas na mesma obra (teste T08).
  select * into v_obra from obras where id = p_obra_id for update;

  if not v_obra.ativa then
    raise exception 'A obra "%" está inativa.', v_obra.nome using errcode = 'P0001';
  end if;

  select coalesce(max(numero), 0) + 1 into v_numero from rdos where obra_id = p_obra_id;

  insert into rdos (empresa_id, obra_id, numero, data, turno, autor_id)
  values (v_obra.empresa_id, p_obra_id, v_numero, p_data, p_turno, auth.uid())
  returning * into v_rdo;

  return v_rdo;
end;
$$;

-- -----------------------------------------------------------------------------
-- rdo_salvar_rascunho — substitui o conteúdo inteiro numa transação
--
-- Itens que chegam com "id" são atualizados; os que somem do payload são
-- apagados. Isso preserva o vínculo das fotos com atividades e ocorrências,
-- que um "apaga tudo e insere de novo" destruiria a cada salvamento.
-- -----------------------------------------------------------------------------

create or replace function rdo_salvar_rascunho(p_rdo_id uuid, p_payload jsonb)
returns rdos
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rdo rdos;
  v_cab jsonb := coalesce(p_payload -> 'rdo', '{}'::jsonb);
begin
  v_rdo := fn_exige_membro(p_rdo_id);

  if v_rdo.autor_id <> auth.uid() then
    raise exception 'Somente o autor edita o RDO.' using errcode = 'P0001';
  end if;

  if v_rdo.status <> 'rascunho' then
    raise exception 'RDO n. % está em "%": não é mais editável.', v_rdo.numero, v_rdo.status
      using errcode = 'P0001';
  end if;

  -- Cabeçalho
  update rdos set
    data = coalesce((nullif(v_cab ->> 'data', ''))::date, data),
    turno = coalesce((nullif(v_cab ->> 'turno', ''))::turno, turno),
    sem_producao_justificativa = nullif(trim(coalesce(v_cab ->> 'sem_producao_justificativa', '')), ''),
    declaracao_aceita = coalesce((v_cab ->> 'declaracao_aceita')::boolean, false)
  where id = p_rdo_id
  returning * into v_rdo;

  -- Clima -------------------------------------------------------------------
  delete from rdo_clima c
  where c.rdo_id = p_rdo_id
    and not exists (
      select 1 from jsonb_array_elements(coalesce(p_payload -> 'clima', '[]'::jsonb)) e
      where (nullif(e ->> 'id', ''))::uuid = c.id
    );

  insert into rdo_clima (
    id, rdo_id, periodo, condicao, temperatura_c, choveu,
    chuva_duracao_min, chuva_impacto, precipitacao_mm, horas_paralisadas
  )
  select
    coalesce((nullif(e ->> 'id', ''))::uuid, gen_random_uuid()),
    p_rdo_id,
    e ->> 'periodo',
    (e ->> 'condicao')::condicao_tempo,
    (nullif(e ->> 'temperatura_c', ''))::numeric,
    coalesce((e ->> 'choveu')::boolean, false),
    (nullif(e ->> 'chuva_duracao_min', ''))::integer,
    nullif(trim(coalesce(e ->> 'chuva_impacto', '')), ''),
    (nullif(e ->> 'precipitacao_mm', ''))::numeric,
    (nullif(e ->> 'horas_paralisadas', ''))::numeric
  from jsonb_array_elements(coalesce(p_payload -> 'clima', '[]'::jsonb)) e
  on conflict (id) do update set
    periodo = excluded.periodo,
    condicao = excluded.condicao,
    temperatura_c = excluded.temperatura_c,
    choveu = excluded.choveu,
    chuva_duracao_min = excluded.chuva_duracao_min,
    chuva_impacto = excluded.chuva_impacto,
    precipitacao_mm = excluded.precipitacao_mm,
    horas_paralisadas = excluded.horas_paralisadas;

  -- Mão de obra --------------------------------------------------------------
  delete from rdo_mao_obra m
  where m.rdo_id = p_rdo_id
    and not exists (
      select 1 from jsonb_array_elements(coalesce(p_payload -> 'mao_obra', '[]'::jsonb)) e
      where (nullif(e ->> 'id', ''))::uuid = m.id
    );

  insert into rdo_mao_obra (id, rdo_id, equipe, funcao, quantidade, horas)
  select
    coalesce((nullif(e ->> 'id', ''))::uuid, gen_random_uuid()),
    p_rdo_id,
    nullif(trim(coalesce(e ->> 'equipe', '')), ''),
    e ->> 'funcao',
    (e ->> 'quantidade')::integer,
    (e ->> 'horas')::numeric
  from jsonb_array_elements(coalesce(p_payload -> 'mao_obra', '[]'::jsonb)) e
  on conflict (id) do update set
    equipe = excluded.equipe,
    funcao = excluded.funcao,
    quantidade = excluded.quantidade,
    horas = excluded.horas;

  -- Equipamentos -------------------------------------------------------------
  delete from rdo_equipamentos q
  where q.rdo_id = p_rdo_id
    and not exists (
      select 1 from jsonb_array_elements(coalesce(p_payload -> 'equipamentos', '[]'::jsonb)) e
      where (nullif(e ->> 'id', ''))::uuid = q.id
    );

  insert into rdo_equipamentos (
    id, rdo_id, tipo, identificacao, quantidade,
    horas_produtivas, horas_paradas, motivo_parada, operador
  )
  select
    coalesce((nullif(e ->> 'id', ''))::uuid, gen_random_uuid()),
    p_rdo_id,
    e ->> 'tipo',
    nullif(trim(coalesce(e ->> 'identificacao', '')), ''),
    coalesce((nullif(e ->> 'quantidade', ''))::integer, 1),
    coalesce((nullif(e ->> 'horas_produtivas', ''))::numeric, 0),
    coalesce((nullif(e ->> 'horas_paradas', ''))::numeric, 0),
    nullif(trim(coalesce(e ->> 'motivo_parada', '')), ''),
    nullif(trim(coalesce(e ->> 'operador', '')), '')
  from jsonb_array_elements(coalesce(p_payload -> 'equipamentos', '[]'::jsonb)) e
  on conflict (id) do update set
    tipo = excluded.tipo,
    identificacao = excluded.identificacao,
    quantidade = excluded.quantidade,
    horas_produtivas = excluded.horas_produtivas,
    horas_paradas = excluded.horas_paradas,
    motivo_parada = excluded.motivo_parada,
    operador = excluded.operador;

  -- Atividades ---------------------------------------------------------------
  delete from rdo_atividades t
  where t.rdo_id = p_rdo_id
    and not exists (
      select 1 from jsonb_array_elements(coalesce(p_payload -> 'atividades', '[]'::jsonb)) e
      where (nullif(e ->> 'id', ''))::uuid = t.id
    );

  insert into rdo_atividades (
    id, rdo_id, local, servico, descricao, unidade, quantidade_dia, percentual, situacao
  )
  select
    coalesce((nullif(e ->> 'id', ''))::uuid, gen_random_uuid()),
    p_rdo_id,
    nullif(trim(coalesce(e ->> 'local', '')), ''),
    e ->> 'servico',
    nullif(trim(coalesce(e ->> 'descricao', '')), ''),
    nullif(trim(coalesce(e ->> 'unidade', '')), ''),
    (nullif(e ->> 'quantidade_dia', ''))::numeric,
    (nullif(e ->> 'percentual', ''))::numeric,
    nullif(trim(coalesce(e ->> 'situacao', '')), '')
  from jsonb_array_elements(coalesce(p_payload -> 'atividades', '[]'::jsonb)) e
  on conflict (id) do update set
    local = excluded.local,
    servico = excluded.servico,
    descricao = excluded.descricao,
    unidade = excluded.unidade,
    quantidade_dia = excluded.quantidade_dia,
    percentual = excluded.percentual,
    situacao = excluded.situacao;

  -- Ocorrências --------------------------------------------------------------
  delete from rdo_ocorrencias oc
  where oc.rdo_id = p_rdo_id
    and not exists (
      select 1 from jsonb_array_elements(coalesce(p_payload -> 'ocorrencias', '[]'::jsonb)) e
      where (nullif(e ->> 'id', ''))::uuid = oc.id
    );

  insert into rdo_ocorrencias (id, rdo_id, descricao, horario, impacto, acao_imediata, responsavel)
  select
    coalesce((nullif(e ->> 'id', ''))::uuid, gen_random_uuid()),
    p_rdo_id,
    e ->> 'descricao',
    (nullif(e ->> 'horario', ''))::timestamptz,
    nullif(trim(coalesce(e ->> 'impacto', '')), ''),
    nullif(trim(coalesce(e ->> 'acao_imediata', '')), ''),
    nullif(trim(coalesce(e ->> 'responsavel', '')), '')
  from jsonb_array_elements(coalesce(p_payload -> 'ocorrencias', '[]'::jsonb)) e
  on conflict (id) do update set
    descricao = excluded.descricao,
    horario = excluded.horario,
    impacto = excluded.impacto,
    acao_imediata = excluded.acao_imediata,
    responsavel = excluded.responsavel;

  -- Pendências ---------------------------------------------------------------
  delete from rdo_pendencias pd
  where pd.rdo_id = p_rdo_id
    and not exists (
      select 1 from jsonb_array_elements(coalesce(p_payload -> 'pendencias', '[]'::jsonb)) e
      where (nullif(e ->> 'id', ''))::uuid = pd.id
    );

  insert into rdo_pendencias (id, rdo_id, descricao, responsavel, prazo, criticidade)
  select
    coalesce((nullif(e ->> 'id', ''))::uuid, gen_random_uuid()),
    p_rdo_id,
    e ->> 'descricao',
    nullif(trim(coalesce(e ->> 'responsavel', '')), ''),
    (nullif(e ->> 'prazo', ''))::date,
    nullif(trim(coalesce(e ->> 'criticidade', '')), '')
  from jsonb_array_elements(coalesce(p_payload -> 'pendencias', '[]'::jsonb)) e
  on conflict (id) do update set
    descricao = excluded.descricao,
    responsavel = excluded.responsavel,
    prazo = excluded.prazo,
    criticidade = excluded.criticidade;

  select * into v_rdo from rdos where id = p_rdo_id;
  return v_rdo;
end;
$$;

-- -----------------------------------------------------------------------------
-- rdo_submeter — regra 8 da seção 4
-- -----------------------------------------------------------------------------

create or replace function rdo_submeter(p_rdo_id uuid)
returns rdos
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rdo rdos;
  v_obra_nome text;
  v_autor_nome text;
begin
  v_rdo := fn_exige_membro(p_rdo_id);

  if v_rdo.autor_id <> auth.uid() then
    raise exception 'Somente o autor submete o RDO.' using errcode = 'P0001';
  end if;

  if v_rdo.status <> 'rascunho' then
    raise exception 'RDO n. % já foi submetido (situação atual: "%").', v_rdo.numero, v_rdo.status
      using errcode = 'P0001';
  end if;

  if not exists (select 1 from rdo_clima where rdo_id = p_rdo_id) then
    raise exception 'Informe o clima de pelo menos um período antes de submeter.'
      using errcode = 'P0001';
  end if;

  if not exists (select 1 from rdo_atividades where rdo_id = p_rdo_id)
     and coalesce(trim(v_rdo.sem_producao_justificativa), '') = '' then
    raise exception 'Registre ao menos uma atividade ou justifique o dia sem produção.'
      using errcode = 'P0001';
  end if;

  if not v_rdo.declaracao_aceita then
    raise exception 'Aceite a declaração de responsabilidade antes de submeter.'
      using errcode = 'P0001';
  end if;

  update rdos set
    status = 'submetido',
    submetido_em = now(),
    devolucao_motivo = null
  where id = p_rdo_id
  returning * into v_rdo;

  select nome into v_obra_nome from obras where id = v_rdo.obra_id;
  select nome into v_autor_nome from perfis where id = v_rdo.autor_id;

  perform fn_notificar_papel(
    v_rdo.obra_id,
    'master',
    p_rdo_id,
    'rdo_submetido',
    format('RDO n. %s aguardando análise', v_rdo.numero),
    format('%s enviou o RDO de %s da obra %s.',
           v_autor_nome, to_char(v_rdo.data, 'DD/MM/YYYY'), v_obra_nome)
  );

  return v_rdo;
end;
$$;

-- -----------------------------------------------------------------------------
-- rdo_iniciar_analise
-- -----------------------------------------------------------------------------

create or replace function rdo_iniciar_analise(p_rdo_id uuid)
returns rdos
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rdo rdos;
begin
  v_rdo := fn_exige_membro(p_rdo_id);

  if fn_papel_na_obra(v_rdo.obra_id) <> 'master' then
    raise exception 'Somente o Master analisa o RDO.' using errcode = 'P0001';
  end if;

  -- Reabrir a análise de um RDO já em análise não é erro: é o Master voltando à tela.
  if v_rdo.status = 'em_analise' then
    return v_rdo;
  end if;

  if v_rdo.status <> 'submetido' then
    raise exception 'RDO n. % está em "%" e não pode entrar em análise.', v_rdo.numero, v_rdo.status
      using errcode = 'P0001';
  end if;

  update rdos set status = 'em_analise' where id = p_rdo_id returning * into v_rdo;
  return v_rdo;
end;
$$;

-- -----------------------------------------------------------------------------
-- rdo_devolver
-- -----------------------------------------------------------------------------

create or replace function rdo_devolver(p_rdo_id uuid, p_motivo text)
returns rdos
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rdo rdos;
  v_numero integer;
begin
  v_rdo := fn_exige_membro(p_rdo_id);

  if fn_papel_na_obra(v_rdo.obra_id) <> 'master' then
    raise exception 'Somente o Master devolve o RDO.' using errcode = 'P0001';
  end if;

  if coalesce(trim(p_motivo), '') = '' then
    raise exception 'Informe o motivo da devolução.' using errcode = 'P0001';
  end if;

  if v_rdo.status not in ('submetido', 'em_analise') then
    raise exception 'RDO n. % está em "%" e não pode ser devolvido.', v_rdo.numero, v_rdo.status
      using errcode = 'P0001';
  end if;

  update rdos set
    status = 'rascunho',
    devolucao_motivo = trim(p_motivo),
    submetido_em = null
  where id = p_rdo_id
  returning * into v_rdo;

  v_numero := v_rdo.numero;

  perform fn_notificar(
    v_rdo.autor_id,
    p_rdo_id,
    'rdo_devolvido',
    format('RDO n. %s devolvido para correção', v_numero),
    trim(p_motivo)
  );

  return v_rdo;
end;
$$;

-- -----------------------------------------------------------------------------
-- rdo_validar — assina, congela a versão e libera para o Cliente
-- -----------------------------------------------------------------------------

create or replace function rdo_validar(
  p_rdo_id uuid,
  p_declaracao_texto text,
  p_dispositivo text
)
returns rdos
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rdo rdos;
  v_obra_nome text;
begin
  v_rdo := fn_exige_membro(p_rdo_id);

  if fn_papel_na_obra(v_rdo.obra_id) <> 'master' then
    raise exception 'Somente o Master valida e assina o RDO.' using errcode = 'P0001';
  end if;

  if v_rdo.status not in ('submetido', 'em_analise') then
    raise exception 'RDO n. % está em "%" e não pode ser validado.', v_rdo.numero, v_rdo.status
      using errcode = 'P0001';
  end if;

  if coalesce(trim(p_declaracao_texto), '') = '' then
    raise exception 'A declaração assinada não pode ficar vazia.' using errcode = 'P0001';
  end if;

  insert into assinaturas (rdo_id, usuario_id, tipo, versao, declaracao_texto, dispositivo)
  values (p_rdo_id, auth.uid(), 'validacao_master', v_rdo.versao, trim(p_declaracao_texto), p_dispositivo);

  update rdos set
    status = 'enviado_cliente',
    validado_em = now()
  where id = p_rdo_id
  returning * into v_rdo;

  -- O snapshot é gravado depois da mudança de status, para registrar o RDO
  -- exatamente como o Cliente vai recebê-lo.
  insert into rdo_versoes (rdo_id, versao, snapshot)
  values (p_rdo_id, v_rdo.versao, fn_rdo_snapshot(p_rdo_id))
  on conflict (rdo_id, versao) do nothing;

  select nome into v_obra_nome from obras where id = v_rdo.obra_id;

  perform fn_notificar_papel(
    v_rdo.obra_id,
    'cliente',
    p_rdo_id,
    'rdo_para_ciencia',
    format('RDO n. %s aguardando sua ciência', v_rdo.numero),
    format('O RDO de %s da obra %s foi validado e está disponível.',
           to_char(v_rdo.data, 'DD/MM/YYYY'), v_obra_nome)
  );

  perform fn_notificar(
    v_rdo.autor_id,
    p_rdo_id,
    'rdo_validado',
    format('RDO n. %s validado', v_rdo.numero),
    format('O RDO de %s foi validado e enviado ao cliente.', to_char(v_rdo.data, 'DD/MM/YYYY'))
  );

  return v_rdo;
end;
$$;

-- -----------------------------------------------------------------------------
-- rdo_cliente_assinar
-- -----------------------------------------------------------------------------

create or replace function rdo_cliente_assinar(
  p_rdo_id uuid,
  p_com_ressalva boolean,
  p_ressalva text,
  p_declaracao_texto text,
  p_dispositivo text
)
returns rdos
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rdo rdos;
  v_tipo tipo_assinatura;
  v_cliente_nome text;
begin
  v_rdo := fn_exige_membro(p_rdo_id);

  if fn_papel_na_obra(v_rdo.obra_id) <> 'cliente' then
    raise exception 'Somente o Cliente dá ciência no RDO.' using errcode = 'P0001';
  end if;

  if v_rdo.status <> 'enviado_cliente' then
    raise exception 'RDO n. % está em "%" e não está aguardando sua ciência.',
      v_rdo.numero, v_rdo.status
      using errcode = 'P0001';
  end if;

  if coalesce(trim(p_declaracao_texto), '') = '' then
    raise exception 'A declaração assinada não pode ficar vazia.' using errcode = 'P0001';
  end if;

  if p_com_ressalva and coalesce(trim(p_ressalva), '') = '' then
    raise exception 'Descreva a ressalva antes de assinar.' using errcode = 'P0001';
  end if;

  v_tipo := case when p_com_ressalva then 'ciencia_cliente_com_ressalva' else 'ciencia_cliente' end;

  insert into assinaturas (rdo_id, usuario_id, tipo, ressalva, versao, declaracao_texto, dispositivo)
  values (
    p_rdo_id,
    auth.uid(),
    v_tipo,
    case when p_com_ressalva then trim(p_ressalva) end,
    v_rdo.versao,
    trim(p_declaracao_texto),
    p_dispositivo
  );

  update rdos set
    status = 'finalizado',
    finalizado_em = now()
  where id = p_rdo_id
  returning * into v_rdo;

  select nome into v_cliente_nome from perfis where id = auth.uid();

  perform fn_notificar_papel(
    v_rdo.obra_id,
    'master',
    p_rdo_id,
    'rdo_finalizado',
    format('RDO n. %s recebeu ciência do cliente', v_rdo.numero),
    case
      when p_com_ressalva then format('%s assinou com ressalva: %s', v_cliente_nome, trim(p_ressalva))
      else format('%s assinou sem ressalva.', v_cliente_nome)
    end
  );

  perform fn_notificar(
    v_rdo.autor_id,
    p_rdo_id,
    'rdo_finalizado',
    format('RDO n. %s finalizado', v_rdo.numero),
    'O cliente deu ciência. O RDO está fechado.'
  );

  return v_rdo;
end;
$$;

-- -----------------------------------------------------------------------------
-- rdo_cliente_pedir_esclarecimento
-- -----------------------------------------------------------------------------

create or replace function rdo_cliente_pedir_esclarecimento(p_rdo_id uuid, p_texto text)
returns rdos
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rdo rdos;
begin
  v_rdo := fn_exige_membro(p_rdo_id);

  if fn_papel_na_obra(v_rdo.obra_id) <> 'cliente' then
    raise exception 'Somente o Cliente pede esclarecimento por aqui.' using errcode = 'P0001';
  end if;

  if v_rdo.status <> 'enviado_cliente' then
    raise exception 'RDO n. % está em "%" e não aceita pedido de esclarecimento.',
      v_rdo.numero, v_rdo.status
      using errcode = 'P0001';
  end if;

  if coalesce(trim(p_texto), '') = '' then
    raise exception 'Descreva o que precisa ser esclarecido.' using errcode = 'P0001';
  end if;

  insert into comentarios (rdo_id, autor_id, alvo_tipo, texto)
  values (p_rdo_id, auth.uid(), 'rdo', trim(p_texto));

  update rdos set status = 'em_analise' where id = p_rdo_id returning * into v_rdo;

  perform fn_notificar_papel(
    v_rdo.obra_id,
    'master',
    p_rdo_id,
    'rdo_esclarecimento',
    format('Cliente pediu esclarecimento no RDO n. %s', v_rdo.numero),
    trim(p_texto)
  );

  return v_rdo;
end;
$$;

-- -----------------------------------------------------------------------------
-- rdo_registrar_pdf — grava o hash uma única vez
-- -----------------------------------------------------------------------------

create or replace function rdo_registrar_pdf(p_rdo_id uuid, p_path text, p_hash text)
returns rdos
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rdo rdos;
begin
  v_rdo := fn_exige_membro(p_rdo_id);

  if v_rdo.status <> 'finalizado' then
    raise exception 'O PDF definitivo só é gerado depois que o RDO é finalizado.'
      using errcode = 'P0001';
  end if;

  if v_rdo.pdf_hash is not null then
    raise exception 'O RDO n. % já tem PDF registrado. O hash não pode ser substituído.', v_rdo.numero
      using errcode = 'P0001';
  end if;

  if coalesce(trim(p_path), '') = '' or coalesce(trim(p_hash), '') = '' then
    raise exception 'Caminho e hash do PDF são obrigatórios.' using errcode = 'P0001';
  end if;

  update rdos set pdf_path = trim(p_path), pdf_hash = trim(p_hash)
  where id = p_rdo_id
  returning * into v_rdo;

  return v_rdo;
end;
$$;

-- -----------------------------------------------------------------------------
-- rdo_retificar — cria uma nova versão vinculada; a original vira "retificado"
-- e permanece intacta (regra 9).
-- -----------------------------------------------------------------------------

create or replace function rdo_retificar(p_rdo_id uuid, p_motivo text)
returns rdos
language plpgsql
security definer
set search_path = public
as $$
declare
  v_origem rdos;
  v_obra obras;
  v_numero integer;
  v_novo rdos;
begin
  v_origem := fn_exige_membro(p_rdo_id);

  if fn_papel_na_obra(v_origem.obra_id) <> 'master' then
    raise exception 'Somente o Master retifica um RDO.' using errcode = 'P0001';
  end if;

  if coalesce(trim(p_motivo), '') = '' then
    raise exception 'Informe o motivo da retificação.' using errcode = 'P0001';
  end if;

  if v_origem.status <> 'finalizado' then
    raise exception 'Só um RDO finalizado pode ser retificado (situação atual: "%").', v_origem.status
      using errcode = 'P0001';
  end if;

  select * into v_obra from obras where id = v_origem.obra_id for update;

  select coalesce(max(numero), 0) + 1 into v_numero from rdos where obra_id = v_origem.obra_id;

  insert into rdos (
    empresa_id, obra_id, numero, data, turno, autor_id,
    versao, rdo_origem_id, motivo_retificacao, sem_producao_justificativa
  )
  values (
    v_origem.empresa_id, v_origem.obra_id, v_numero, v_origem.data, v_origem.turno, auth.uid(),
    v_origem.versao + 1, v_origem.id, trim(p_motivo), v_origem.sem_producao_justificativa
  )
  returning * into v_novo;

  -- Cópia do conteúdo: o novo RDO nasce em rascunho, então os triggers das
  -- tabelas filhas liberam a escrita.
  insert into rdo_clima (rdo_id, periodo, condicao, temperatura_c, choveu,
                         chuva_duracao_min, chuva_impacto, precipitacao_mm, horas_paralisadas)
  select v_novo.id, periodo, condicao, temperatura_c, choveu,
         chuva_duracao_min, chuva_impacto, precipitacao_mm, horas_paralisadas
  from rdo_clima where rdo_id = v_origem.id;

  insert into rdo_mao_obra (rdo_id, equipe, funcao, quantidade, horas)
  select v_novo.id, equipe, funcao, quantidade, horas
  from rdo_mao_obra where rdo_id = v_origem.id;

  insert into rdo_equipamentos (rdo_id, tipo, identificacao, quantidade,
                                horas_produtivas, horas_paradas, motivo_parada, operador)
  select v_novo.id, tipo, identificacao, quantidade,
         horas_produtivas, horas_paradas, motivo_parada, operador
  from rdo_equipamentos where rdo_id = v_origem.id;

  insert into rdo_atividades (rdo_id, local, servico, descricao, unidade,
                              quantidade_dia, percentual, situacao)
  select v_novo.id, local, servico, descricao, unidade, quantidade_dia, percentual, situacao
  from rdo_atividades where rdo_id = v_origem.id;

  insert into rdo_ocorrencias (rdo_id, descricao, horario, impacto, acao_imediata, responsavel)
  select v_novo.id, descricao, horario, impacto, acao_imediata, responsavel
  from rdo_ocorrencias where rdo_id = v_origem.id;

  insert into rdo_pendencias (rdo_id, descricao, responsavel, prazo, criticidade)
  select v_novo.id, descricao, responsavel, prazo, criticidade
  from rdo_pendencias where rdo_id = v_origem.id;

  update rdos set status = 'retificado' where id = v_origem.id;

  perform fn_notificar(
    v_origem.autor_id,
    v_novo.id,
    'rdo_retificado',
    format('RDO n. %s retificado — nova versão n. %s', v_origem.numero, v_novo.numero),
    trim(p_motivo)
  );

  return v_novo;
end;
$$;

-- -----------------------------------------------------------------------------
-- rdo_cancelar
-- -----------------------------------------------------------------------------

create or replace function rdo_cancelar(p_rdo_id uuid, p_motivo text)
returns rdos
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rdo rdos;
begin
  v_rdo := fn_exige_membro(p_rdo_id);

  if fn_papel_na_obra(v_rdo.obra_id) <> 'master' then
    raise exception 'Somente o Master cancela um RDO.' using errcode = 'P0001';
  end if;

  if coalesce(trim(p_motivo), '') = '' then
    raise exception 'Informe o motivo do cancelamento.' using errcode = 'P0001';
  end if;

  if v_rdo.status = 'cancelado' then
    raise exception 'RDO n. % já está cancelado.', v_rdo.numero using errcode = 'P0001';
  end if;

  update rdos set
    status = 'cancelado',
    cancelado_em = now(),
    cancelamento_motivo = trim(p_motivo)
  where id = p_rdo_id
  returning * into v_rdo;

  perform fn_notificar(
    v_rdo.autor_id,
    p_rdo_id,
    'rdo_cancelado',
    format('RDO n. %s cancelado', v_rdo.numero),
    trim(p_motivo)
  );

  return v_rdo;
end;
$$;

-- -----------------------------------------------------------------------------
-- Permissões: authenticated chama as RPC; anon não chama nada.
-- -----------------------------------------------------------------------------

revoke execute on all functions in schema public from anon;

grant execute on function
  rdo_criar(uuid, date, turno),
  rdo_salvar_rascunho(uuid, jsonb),
  rdo_submeter(uuid),
  rdo_iniciar_analise(uuid),
  rdo_devolver(uuid, text),
  rdo_validar(uuid, text, text),
  rdo_cliente_assinar(uuid, boolean, text, text, text),
  rdo_cliente_pedir_esclarecimento(uuid, text),
  rdo_registrar_pdf(uuid, text, text),
  rdo_retificar(uuid, text),
  rdo_cancelar(uuid, text)
to authenticated;
