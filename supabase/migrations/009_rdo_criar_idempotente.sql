-- =============================================================================
-- Prumo RDO — 009: rdo_criar idempotente
--
-- O aparelho gera o id do RDO (uuid) quando o rascunho nasce, ainda offline.
-- Na sincronização esse id vai junto. Se a resposta da primeira chamada se
-- perder na rede e o app tentar de novo, a função devolve o RDO já criado em
-- vez de gastar outro número da obra. É o "sem duplicar" da Parte 5.
-- =============================================================================

drop function if exists rdo_criar(uuid, date, turno);

create or replace function rdo_criar(
  p_obra_id uuid,
  p_data date,
  p_turno turno,
  p_id uuid default null
)
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

  if p_id is not null then
    select * into v_rdo from rdos where id = p_id;
    if v_rdo.id is not null then
      if v_rdo.autor_id <> auth.uid() then
        raise exception 'Identificador de RDO já usado por outro autor.' using errcode = 'P0001';
      end if;
      return v_rdo;
    end if;
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

  insert into rdos (id, empresa_id, obra_id, numero, data, turno, autor_id)
  values (
    coalesce(p_id, gen_random_uuid()),
    v_obra.empresa_id,
    p_obra_id,
    v_numero,
    p_data,
    p_turno,
    auth.uid()
  )
  returning * into v_rdo;

  return v_rdo;
end;
$$;

revoke execute on function rdo_criar(uuid, date, turno, uuid) from anon;
grant execute on function rdo_criar(uuid, date, turno, uuid) to authenticated;
