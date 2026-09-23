-- =============================================================================
-- Prumo RDO — testes de violação (T01 a T08)
--
-- Prova que as regras de integridade vivem no banco, não na tela.
--
-- Como rodar: cole o arquivo inteiro no SQL Editor do Supabase e execute.
-- O script monta os próprios dados, roda os oito casos e termina em ROLLBACK:
-- nada fica no banco depois. Pode rodar quantas vezes quiser.
--
-- A última consulta devolve a tabela de resultados, pronta para o artigo.
-- =============================================================================

begin;

create temp table resultado_teste (
  caso text,
  tentativa text,
  barrado_por text,
  esperado text,
  obtido text,
  passou boolean,
  detalhe text
) on commit drop;

-- -----------------------------------------------------------------------------
-- Cenário
-- -----------------------------------------------------------------------------

do $$
declare
  v_empresa uuid := gen_random_uuid();
  v_master uuid := gen_random_uuid();
  v_oper uuid := gen_random_uuid();
  v_cliente uuid := gen_random_uuid();
  v_alfa uuid := gen_random_uuid();
  v_beta uuid := gen_random_uuid();
  v_rdo_liberado uuid;
  v_rdo_beta uuid;
  v_rdo_incompleto uuid;
begin
  insert into empresas (id, razao_social, cnpj)
  values (v_empresa, 'PLANENGEN (cenário de teste)', '00.000.000/0001-00');

  insert into auth.users (instance_id, id, aud, role, email, encrypted_password,
                          email_confirmed_at, created_at, updated_at)
  values
    ('00000000-0000-0000-0000-000000000000', v_master, 'authenticated', 'authenticated',
     't_master@prumo.test', 'x', now(), now(), now()),
    ('00000000-0000-0000-0000-000000000000', v_oper, 'authenticated', 'authenticated',
     't_oper@prumo.test', 'x', now(), now(), now()),
    ('00000000-0000-0000-0000-000000000000', v_cliente, 'authenticated', 'authenticated',
     't_cliente@prumo.test', 'x', now(), now(), now());

  insert into perfis (id, empresa_id, nome, email, papel) values
    (v_master, v_empresa, 'Eng. Teste', 't_master@prumo.test', 'master'),
    (v_oper, v_empresa, 'Campo Teste', 't_oper@prumo.test', 'operacional'),
    (v_cliente, v_empresa, 'Cliente Teste', 't_cliente@prumo.test', 'cliente');

  insert into obras (id, empresa_id, nome) values
    (v_alfa, v_empresa, 'Obra Alfa (teste)'),
    (v_beta, v_empresa, 'Obra Beta (teste)');

  -- O operacional entra só na Alfa. A Beta existe para provar o T01.
  insert into obra_membros (obra_id, usuario_id, papel) values
    (v_alfa, v_master, 'master'),
    (v_alfa, v_oper, 'operacional'),
    (v_alfa, v_cliente, 'cliente'),
    (v_beta, v_master, 'master'),
    (v_beta, v_cliente, 'cliente');

  -- RDO da Beta, invisível para o operacional.
  insert into rdos (empresa_id, obra_id, numero, data, turno, autor_id)
  values (v_empresa, v_beta, 1, current_date - 1, 'integral', v_master)
  returning id into v_rdo_beta;

  -- RDO da Alfa que percorre o fluxo até finalizado. O conteúdo entra enquanto
  -- ainda é rascunho, porque os triggers já estão valendo aqui também.
  insert into rdos (empresa_id, obra_id, numero, data, turno, autor_id, declaracao_aceita)
  values (v_empresa, v_alfa, 1, current_date - 1, 'integral', v_oper, true)
  returning id into v_rdo_liberado;

  insert into rdo_clima (rdo_id, periodo, condicao) values (v_rdo_liberado, 'manha', 'sol');
  insert into rdo_atividades (rdo_id, servico) values (v_rdo_liberado, 'Alvenaria');

  update rdos set status = 'finalizado', submetido_em = now(),
                  validado_em = now(), finalizado_em = now()
  where id = v_rdo_liberado;

  -- RDO da Alfa sem clima, para o T05.
  insert into rdos (empresa_id, obra_id, numero, data, turno, autor_id, declaracao_aceita)
  values (v_empresa, v_alfa, 2, current_date, 'integral', v_oper, true)
  returning id into v_rdo_incompleto;

  insert into rdo_atividades (rdo_id, servico) values (v_rdo_incompleto, 'Fôrma');

  -- Guarda os identificadores para os blocos seguintes.
  create temp table cenario (chave text primary key, valor uuid) on commit drop;
  insert into cenario values
    ('empresa', v_empresa),
    ('master', v_master),
    ('oper', v_oper),
    ('cliente', v_cliente),
    ('alfa', v_alfa),
    ('beta', v_beta),
    ('rdo_liberado', v_rdo_liberado),
    ('rdo_beta', v_rdo_beta),
    ('rdo_incompleto', v_rdo_incompleto);
end
$$;

-- -----------------------------------------------------------------------------
-- T01 — Operacional lê RDO de obra à qual não está vinculado
-- -----------------------------------------------------------------------------

do $$
declare
  v_papel_original text := current_user;
  v_oper uuid := (select valor from cenario where chave = 'oper');
  v_beta uuid := (select valor from cenario where chave = 'beta');
  v_linhas integer;
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_oper, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);

  select count(*) into v_linhas from rdos where obra_id = v_beta;

  perform set_config('role', v_papel_original, true);

  insert into resultado_teste values (
    'T01',
    'Operacional lê RDO de obra não vinculada',
    'RLS (política rdos_leitura)',
    '0 linhas',
    v_linhas || ' linha(s)',
    v_linhas = 0,
    'A obra Beta existe e tem RDO, mas não aparece para quem não é membro.'
  );
end
$$;

-- -----------------------------------------------------------------------------
-- T02 — Cliente altera campo técnico de RDO liberado
-- -----------------------------------------------------------------------------

do $$
declare
  v_papel_original text := current_user;
  v_cliente uuid := (select valor from cenario where chave = 'cliente');
  v_rdo uuid := (select valor from cenario where chave = 'rdo_liberado');
  v_linhas integer := -1;
  v_erro text;
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_cliente, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);

  begin
    update rdos set sem_producao_justificativa = 'alterado pelo cliente' where id = v_rdo;
    get diagnostics v_linhas = row_count;
  exception when others then
    v_erro := sqlerrm;
  end;

  perform set_config('role', v_papel_original, true);

  insert into resultado_teste values (
    'T02',
    'Cliente altera campo técnico de RDO liberado',
    'RLS (sem política de UPDATE para Cliente)',
    'Rejeitado',
    case when v_erro is not null then 'Rejeitado por exceção'
         else 'Rejeitado — ' || v_linhas || ' linha(s) afetada(s)' end,
    v_erro is not null or v_linhas = 0,
    coalesce(v_erro, 'A política de UPDATE exige autoria e rascunho; nenhuma linha fica visível para escrita.')
  );
end
$$;

-- -----------------------------------------------------------------------------
-- T03 — Alterar conteúdo de RDO já assinado
--
-- Rodado com RLS desligada (papel dono da tabela, equivalente à service_role
-- chamando a API direto). É o caso que sustenta a tese: mesmo sem passar pela
-- RLS, o trigger recusa.
-- -----------------------------------------------------------------------------

do $$
declare
  v_rdo uuid := (select valor from cenario where chave = 'rdo_liberado');
  v_erro text;
  v_passou boolean := false;
begin
  begin
    update rdos set sem_producao_justificativa = 'adulterado' where id = v_rdo;
  exception when others then
    v_erro := sqlerrm;
    v_passou := true;
  end;

  insert into resultado_teste values (
    'T03',
    'Alterar conteúdo de RDO já assinado (RLS desligada)',
    'Trigger trg_rdos_conteudo_imutavel',
    'Rejeitado pelo trigger',
    case when v_passou then 'Rejeitado pelo trigger' else 'PERMITIDO' end,
    v_passou,
    coalesce(v_erro, 'FALHA: o conteúdo foi alterado.')
  );
end
$$;

-- -----------------------------------------------------------------------------
-- T04 — Excluir RDO validado
-- -----------------------------------------------------------------------------

do $$
declare
  v_rdo uuid := (select valor from cenario where chave = 'rdo_liberado');
  v_erro text;
  v_passou boolean := false;
begin
  begin
    delete from rdos where id = v_rdo;
  exception when others then
    v_erro := sqlerrm;
    v_passou := true;
  end;

  insert into resultado_teste values (
    'T04',
    'Excluir RDO validado (RLS desligada)',
    'Trigger trg_rdos_sem_delete + ausência de política de DELETE',
    'Rejeitado',
    case when v_passou then 'Rejeitado pelo trigger' else 'PERMITIDO' end,
    v_passou,
    coalesce(v_erro, 'FALHA: o RDO foi excluído.')
  );
end
$$;

-- -----------------------------------------------------------------------------
-- T05 — Submeter RDO sem clima
-- -----------------------------------------------------------------------------

do $$
declare
  v_papel_original text := current_user;
  v_oper uuid := (select valor from cenario where chave = 'oper');
  v_rdo uuid := (select valor from cenario where chave = 'rdo_incompleto');
  v_erro text;
  v_passou boolean := false;
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_oper, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);

  begin
    perform rdo_submeter(v_rdo);
  exception when others then
    v_erro := sqlerrm;
    v_passou := true;
  end;

  perform set_config('role', v_papel_original, true);

  insert into resultado_teste values (
    'T05',
    'Submeter RDO sem clima',
    'Função rdo_submeter (regra 8)',
    'Rejeitado pela função',
    case when v_passou then 'Rejeitado pela função' else 'PERMITIDO' end,
    v_passou,
    coalesce(v_erro, 'FALHA: o RDO foi submetido sem clima.')
  );
end
$$;

-- -----------------------------------------------------------------------------
-- T06 — Inserir foto sem legenda
-- -----------------------------------------------------------------------------

do $$
declare
  v_rdo uuid := (select valor from cenario where chave = 'rdo_incompleto');
  v_oper uuid := (select valor from cenario where chave = 'oper');
  v_erro text;
  v_passou boolean := false;
begin
  begin
    insert into rdo_fotos (rdo_id, storage_path, legenda, autor_id)
    values (v_rdo, 'obra/rdo/foto.jpg', '   ', v_oper);
  exception when others then
    v_erro := sqlerrm;
    v_passou := true;
  end;

  insert into resultado_teste values (
    'T06',
    'Inserir foto sem legenda (RLS desligada)',
    'CHECK rdo_fotos_legenda_minima',
    'Rejeitado pelo CHECK',
    case when v_passou then 'Rejeitado pelo CHECK' else 'PERMITIDO' end,
    v_passou,
    coalesce(v_erro, 'FALHA: a foto entrou sem legenda.')
  );
end
$$;

-- -----------------------------------------------------------------------------
-- T07 — Alterar linha de auditoria
-- -----------------------------------------------------------------------------

do $$
declare
  v_id bigint;
  v_erro text;
  v_passou boolean := false;
begin
  select id into v_id from auditoria order by id desc limit 1;

  if v_id is null then
    insert into resultado_teste values (
      'T07', 'Alterar linha de auditoria', 'Trigger trg_auditoria_imutavel',
      'Rejeitado', 'INCONCLUSIVO', false,
      'Nenhuma linha de auditoria foi gerada — verifique os triggers de auditoria.'
    );
    return;
  end if;

  begin
    update auditoria set acao = 'MASCARADO' where id = v_id;
  exception when others then
    v_erro := sqlerrm;
    v_passou := true;
  end;

  insert into resultado_teste values (
    'T07',
    'Alterar linha de auditoria (RLS desligada)',
    'Trigger trg_auditoria_imutavel',
    'Rejeitado',
    case when v_passou then 'Rejeitado pelo trigger' else 'PERMITIDO' end,
    v_passou,
    coalesce(v_erro, 'FALHA: a auditoria foi adulterada.')
  );
end
$$;

-- -----------------------------------------------------------------------------
-- T08 — Numeração sequencial por obra
--
-- Duas criações seguidas devem render números distintos e consecutivos. A
-- serialização de fato vem do SELECT ... FOR UPDATE na linha da obra dentro de
-- rdo_criar; a segunda parte do teste confirma que, mesmo se o lock falhasse,
-- a UNIQUE (obra_id, numero) ainda barraria a colisão.
-- -----------------------------------------------------------------------------

do $$
declare
  v_papel_original text := current_user;
  v_oper uuid := (select valor from cenario where chave = 'oper');
  v_alfa uuid := (select valor from cenario where chave = 'alfa');
  v_a rdos;
  v_b rdos;
  v_erro_colisao text;
  v_sequencial boolean;
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_oper, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);

  v_a := rdo_criar(v_alfa, current_date, 'manha');
  v_b := rdo_criar(v_alfa, current_date, 'tarde');

  perform set_config('role', v_papel_original, true);

  v_sequencial := v_a.numero <> v_b.numero and v_b.numero = v_a.numero + 1;

  begin
    insert into rdos (empresa_id, obra_id, numero, data, turno, autor_id)
    values (v_a.empresa_id, v_alfa, v_a.numero, current_date, 'noite', v_oper);
  exception when others then
    v_erro_colisao := sqlerrm;
  end;

  insert into resultado_teste values (
    'T08',
    'Duas criações na mesma obra',
    'rdo_criar com SELECT ... FOR UPDATE + UNIQUE (obra_id, numero)',
    'Números distintos e sequenciais',
    format('n. %s e n. %s; colisão forçada: %s',
           v_a.numero, v_b.numero,
           case when v_erro_colisao is not null then 'rejeitada' else 'ACEITA' end),
    v_sequencial and v_erro_colisao is not null,
    coalesce(v_erro_colisao, 'FALHA: número duplicado foi aceito.')
  );
end
$$;

-- -----------------------------------------------------------------------------
-- Resultado
-- -----------------------------------------------------------------------------

select
  caso,
  tentativa,
  barrado_por,
  esperado,
  obtido,
  case when passou then 'PASSOU' else 'FALHOU' end as veredito,
  detalhe
from resultado_teste

union all

select
  'RESUMO',
  count(*) filter (where passou) || ' de ' || count(*) || ' casos passaram',
  '',
  '',
  '',
  case when bool_and(passou) then 'PASSOU' else 'FALHOU' end,
  ''
from resultado_teste

order by 1;

rollback;
