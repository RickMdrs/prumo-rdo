-- =============================================================================
-- Prumo RDO — 012: obra parada
--
-- Quando ninguém trabalhou na obra no dia (chuva o dia todo, feriado, embargo,
-- falta de material), o RDO continua obrigatório, mas não há clima de trabalho
-- nem serviço a registrar. Basta o motivo, gravado em
-- `sem_producao_justificativa` (mínimo de 10 caracteres).
--
-- Num dia normal, a regra 8 continua igual: clima de pelo menos um período e
-- ao menos uma atividade.
-- =============================================================================

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
  v_parada boolean;
begin
  v_rdo := fn_exige_membro(p_rdo_id);

  if v_rdo.autor_id <> auth.uid() then
    raise exception 'Somente o autor submete o RDO.' using errcode = 'P0001';
  end if;

  if v_rdo.status <> 'rascunho' then
    raise exception 'RDO n. % já foi submetido (situação atual: "%").', v_rdo.numero, v_rdo.status
      using errcode = 'P0001';
  end if;

  v_parada := coalesce(trim(v_rdo.sem_producao_justificativa), '') <> '';

  if v_parada and char_length(trim(v_rdo.sem_producao_justificativa)) < 10 then
    raise exception 'Descreva o motivo da obra parada (mínimo de 10 caracteres).'
      using errcode = 'P0001';
  end if;

  if not v_parada then
    if not exists (select 1 from rdo_clima where rdo_id = p_rdo_id) then
      raise exception 'Informe o clima de pelo menos um período antes de submeter.'
        using errcode = 'P0001';
    end if;

    if not exists (select 1 from rdo_atividades where rdo_id = p_rdo_id) then
      raise exception 'Registre ao menos uma atividade ou marque a obra como parada.'
        using errcode = 'P0001';
    end if;
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
    case
      when v_parada then format('RDO n. %s: obra parada', v_rdo.numero)
      else format('RDO n. %s aguardando análise', v_rdo.numero)
    end,
    case
      when v_parada then format('%s registrou a obra %s parada em %s. Motivo: %s',
                                v_autor_nome, v_obra_nome, to_char(v_rdo.data, 'DD/MM/YYYY'),
                                trim(v_rdo.sem_producao_justificativa))
      else format('%s enviou o RDO de %s da obra %s.',
                  v_autor_nome, to_char(v_rdo.data, 'DD/MM/YYYY'), v_obra_nome)
    end
  );

  return v_rdo;
end;
$$;
