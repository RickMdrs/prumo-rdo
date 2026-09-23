-- =============================================================================
-- Prumo RDO — 004: triggers de integridade e auditoria
--
-- Diferença essencial em relação à RLS: trigger vale para TODO MUNDO, inclusive
-- service_role e o dono do banco. É o que sustenta as regras 1 a 4 da seção 4:
-- nem quem tem a chave mestra consegue alterar um RDO assinado.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- updated_at
-- -----------------------------------------------------------------------------

create or replace function fn_marca_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_rdos_updated_at
  before update on rdos
  for each row execute function fn_marca_updated_at();

-- -----------------------------------------------------------------------------
-- Regra 2 — RDO fora de rascunho não muda conteúdo.
-- Só as colunas de controle podem variar.
-- -----------------------------------------------------------------------------

create or replace function fn_bloqueia_alteracao_rdo()
returns trigger
language plpgsql
as $$
declare
  colunas_controle text[] := array[
    'status',
    'submetido_em',
    'validado_em',
    'finalizado_em',
    'cancelado_em',
    'pdf_path',
    'pdf_hash',
    'devolucao_motivo',
    'cancelamento_motivo',
    'updated_at'
  ];
  antes jsonb;
  depois jsonb;
begin
  if old.status = 'rascunho' then
    return new;
  end if;

  antes := to_jsonb(old) - colunas_controle;
  depois := to_jsonb(new) - colunas_controle;

  if antes is distinct from depois then
    raise exception
      'RDO n. % está em "%": o conteúdo não pode mais ser alterado.',
      old.numero, old.status
      using
        errcode = 'P0001',
        hint = 'Um RDO fora de rascunho só se corrige por retificação, que cria uma nova versão.';
  end if;

  return new;
end;
$$;

create trigger trg_rdos_conteudo_imutavel
  before update on rdos
  for each row execute function fn_bloqueia_alteracao_rdo();

-- -----------------------------------------------------------------------------
-- Regra 3 — ninguém apaga RDO. Cancelamento é lógico.
-- -----------------------------------------------------------------------------

create or replace function fn_bloqueia_delete_rdo()
returns trigger
language plpgsql
as $$
begin
  raise exception 'RDO não pode ser excluído. Use o cancelamento, que preserva o registro.'
    using errcode = 'P0001';
end;
$$;

create trigger trg_rdos_sem_delete
  before delete on rdos
  for each row execute function fn_bloqueia_delete_rdo();

-- -----------------------------------------------------------------------------
-- Regra 1 — conteúdo só é editável com o RDO pai em rascunho.
-- -----------------------------------------------------------------------------

create or replace function fn_bloqueia_edicao_filha()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rdo_id uuid;
  v_status status_rdo;
  v_numero integer;
begin
  v_rdo_id := case when tg_op = 'DELETE' then old.rdo_id else new.rdo_id end;

  select status, numero into v_status, v_numero from rdos where id = v_rdo_id;

  if v_status is null then
    raise exception 'RDO % não existe.', v_rdo_id using errcode = 'P0001';
  end if;

  if v_status <> 'rascunho' then
    raise exception
      'RDO n. % está em "%": não é possível % registros de %.',
      v_numero,
      v_status,
      lower(tg_op),
      tg_table_name
      using errcode = 'P0001';
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'rdo_clima',
    'rdo_mao_obra',
    'rdo_equipamentos',
    'rdo_atividades',
    'rdo_ocorrencias',
    'rdo_pendencias',
    'rdo_fotos'
  ]
  loop
    execute format(
      'create trigger trg_%1$s_so_rascunho
         before insert or update or delete on %1$s
         for each row execute function fn_bloqueia_edicao_filha();', t);
  end loop;
end
$$;

-- -----------------------------------------------------------------------------
-- Assinatura e comentário são rastro: nascem e não mudam mais.
-- -----------------------------------------------------------------------------

create or replace function fn_registro_imutavel()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Registros de % não podem ser alterados nem excluídos.', tg_table_name
    using errcode = 'P0001';
end;
$$;

create trigger trg_assinaturas_imutaveis
  before update or delete on assinaturas
  for each row execute function fn_registro_imutavel();

create trigger trg_comentarios_imutaveis
  before update or delete on comentarios
  for each row execute function fn_registro_imutavel();

create trigger trg_rdo_versoes_imutaveis
  before update or delete on rdo_versoes
  for each row execute function fn_registro_imutavel();

-- -----------------------------------------------------------------------------
-- Regra 4 — auditoria. A tabela recebe INSERT pelo trigger (SECURITY DEFINER,
-- já que não existe política de INSERT) e rejeita UPDATE e DELETE de qualquer um.
-- -----------------------------------------------------------------------------

create or replace function fn_auditoria()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_antes jsonb;
  v_depois jsonb;
  v_dados jsonb;
  v_empresa_id uuid;
  v_registro_id uuid;
begin
  if tg_op in ('UPDATE', 'DELETE') then
    v_antes := to_jsonb(old);
  end if;

  if tg_op in ('INSERT', 'UPDATE') then
    v_depois := to_jsonb(new);
  end if;

  v_dados := coalesce(v_depois, v_antes);
  v_registro_id := (v_dados ->> 'id')::uuid;

  if tg_table_name = 'rdos' then
    v_empresa_id := (v_dados ->> 'empresa_id')::uuid;
  else
    select empresa_id into v_empresa_id
    from rdos
    where id = (v_dados ->> 'rdo_id')::uuid;
  end if;

  insert into auditoria (empresa_id, ator_id, acao, tabela, registro_id, antes, depois)
  values (v_empresa_id, auth.uid(), tg_op, tg_table_name, v_registro_id, v_antes, v_depois);

  return null;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'rdos',
    'rdo_clima',
    'rdo_mao_obra',
    'rdo_equipamentos',
    'rdo_atividades',
    'rdo_ocorrencias',
    'rdo_pendencias',
    'rdo_fotos',
    'assinaturas',
    'comentarios'
  ]
  loop
    execute format(
      'create trigger trg_%1$s_auditoria
         after insert or update or delete on %1$s
         for each row execute function fn_auditoria();', t);
  end loop;
end
$$;

create or replace function fn_auditoria_imutavel()
returns trigger
language plpgsql
as $$
begin
  raise exception 'A auditoria é somente gravação. Linhas não podem ser alteradas nem excluídas.'
    using errcode = 'P0001';
end;
$$;

create trigger trg_auditoria_imutavel
  before update or delete on auditoria
  for each row execute function fn_auditoria_imutavel();

-- -----------------------------------------------------------------------------
-- Quem cria a obra entra nela como Master — senão a própria RLS esconderia
-- a obra recém-criada do criador.
-- -----------------------------------------------------------------------------

create or replace function fn_vincula_criador_da_obra()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  insert into obra_membros (obra_id, usuario_id, papel)
  values (new.id, auth.uid(), 'master')
  on conflict do nothing;

  return new;
end;
$$;

create trigger trg_obras_vincula_criador
  after insert on obras
  for each row execute function fn_vincula_criador_da_obra();
