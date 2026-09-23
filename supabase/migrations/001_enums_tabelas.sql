-- =============================================================================
-- Prumo RDO — 001: enums, tabelas, chaves, índices e restrições
-- =============================================================================

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------

create type papel_usuario as enum ('master', 'operacional', 'cliente');

create type status_rdo as enum (
  'rascunho',
  'submetido',
  'em_analise',
  'validado',
  'enviado_cliente',
  'finalizado',
  'retificado',
  'cancelado'
);

create type turno as enum ('manha', 'tarde', 'noite', 'integral');

create type condicao_tempo as enum (
  'sol',
  'nublado',
  'chuva_fraca',
  'chuva_forte',
  'impraticavel'
);

create type tipo_assinatura as enum (
  'validacao_master',
  'ciencia_cliente',
  'ciencia_cliente_com_ressalva'
);

-- -----------------------------------------------------------------------------
-- Cadastros
-- -----------------------------------------------------------------------------

create table empresas (
  id uuid primary key default gen_random_uuid(),
  razao_social text not null,
  cnpj text unique,
  created_at timestamptz not null default now()
);

create table perfis (
  id uuid primary key references auth.users (id) on delete cascade,
  empresa_id uuid not null references empresas (id),
  nome text not null,
  email text not null,
  papel papel_usuario not null,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create index perfis_empresa_idx on perfis (empresa_id);

create table obras (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas (id),
  nome text not null,
  endereco text,
  contrato text,
  cliente_nome text,
  inicio date,
  fim_previsto date,
  fuso text not null default 'America/Fortaleza',
  ativa boolean not null default true,
  created_at timestamptz not null default now()
);

create index obras_empresa_idx on obras (empresa_id) where ativa;

create table obra_membros (
  obra_id uuid not null references obras (id) on delete cascade,
  usuario_id uuid not null references perfis (id) on delete cascade,
  papel papel_usuario not null,
  created_at timestamptz not null default now(),
  primary key (obra_id, usuario_id)
);

create index obra_membros_usuario_idx on obra_membros (usuario_id);

-- -----------------------------------------------------------------------------
-- RDO
-- -----------------------------------------------------------------------------

create table rdos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas (id),
  obra_id uuid not null references obras (id),
  numero integer not null,
  data date not null,
  turno turno not null,
  status status_rdo not null default 'rascunho',
  autor_id uuid not null references perfis (id),
  versao integer not null default 1,
  rdo_origem_id uuid references rdos (id),
  motivo_retificacao text,
  sem_producao_justificativa text,
  declaracao_aceita boolean not null default false,
  devolucao_motivo text,
  pdf_path text,
  pdf_hash text,
  submetido_em timestamptz,
  validado_em timestamptz,
  finalizado_em timestamptz,
  cancelado_em timestamptz,
  cancelamento_motivo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rdos_numero_por_obra unique (obra_id, numero),
  -- O fuso da obra é America/Fortaleza: usar current_date (UTC) liberaria
  -- o dia seguinte a partir das 21h no horário local.
  constraint rdos_data_nao_futura check (data <= (now() at time zone 'America/Fortaleza')::date)
);

create index rdos_obra_status_idx on rdos (obra_id, status);
create index rdos_autor_idx on rdos (autor_id);
create index rdos_origem_idx on rdos (rdo_origem_id);
create index rdos_data_idx on rdos (obra_id, data desc);

-- -----------------------------------------------------------------------------
-- Tabelas filhas do RDO
-- -----------------------------------------------------------------------------

create table rdo_clima (
  id uuid primary key default gen_random_uuid(),
  rdo_id uuid not null references rdos (id) on delete cascade,
  periodo text not null,
  condicao condicao_tempo not null,
  temperatura_c numeric(4, 1),
  choveu boolean not null default false,
  chuva_duracao_min integer,
  chuva_impacto text,
  precipitacao_mm numeric(6, 2),
  horas_paralisadas numeric(5, 2),
  created_at timestamptz not null default now(),
  constraint rdo_clima_periodo_valido check (periodo in ('manha', 'tarde', 'noite')),
  constraint rdo_clima_periodo_unico unique (rdo_id, periodo),
  constraint rdo_clima_chuva_detalhada check (
    choveu = false
    or (chuva_duracao_min is not null and chuva_impacto is not null)
  )
);

create index rdo_clima_rdo_idx on rdo_clima (rdo_id);

create table rdo_mao_obra (
  id uuid primary key default gen_random_uuid(),
  rdo_id uuid not null references rdos (id) on delete cascade,
  equipe text,
  funcao text not null,
  quantidade integer not null check (quantidade > 0),
  horas numeric(5, 2) not null check (horas >= 0),
  created_at timestamptz not null default now()
);

create index rdo_mao_obra_rdo_idx on rdo_mao_obra (rdo_id);

create table rdo_equipamentos (
  id uuid primary key default gen_random_uuid(),
  rdo_id uuid not null references rdos (id) on delete cascade,
  tipo text not null,
  identificacao text,
  quantidade integer not null default 1 check (quantidade > 0),
  horas_produtivas numeric(5, 2) not null default 0 check (horas_produtivas >= 0),
  horas_paradas numeric(5, 2) not null default 0 check (horas_paradas >= 0),
  motivo_parada text,
  operador text,
  created_at timestamptz not null default now(),
  constraint rdo_equipamentos_parada_justificada check (
    horas_paradas = 0
    or motivo_parada is not null
  )
);

create index rdo_equipamentos_rdo_idx on rdo_equipamentos (rdo_id);

create table rdo_atividades (
  id uuid primary key default gen_random_uuid(),
  rdo_id uuid not null references rdos (id) on delete cascade,
  local text,
  servico text not null,
  descricao text,
  unidade text,
  quantidade_dia numeric(12, 3),
  percentual numeric(5, 2) check (percentual between 0 and 100),
  situacao text,
  created_at timestamptz not null default now()
);

create index rdo_atividades_rdo_idx on rdo_atividades (rdo_id);

create table rdo_ocorrencias (
  id uuid primary key default gen_random_uuid(),
  rdo_id uuid not null references rdos (id) on delete cascade,
  descricao text not null,
  horario timestamptz,
  impacto text,
  acao_imediata text,
  responsavel text,
  created_at timestamptz not null default now()
);

create index rdo_ocorrencias_rdo_idx on rdo_ocorrencias (rdo_id);

create table rdo_pendencias (
  id uuid primary key default gen_random_uuid(),
  rdo_id uuid not null references rdos (id) on delete cascade,
  descricao text not null,
  responsavel text,
  prazo date,
  criticidade text,
  created_at timestamptz not null default now()
);

create index rdo_pendencias_rdo_idx on rdo_pendencias (rdo_id);

create table rdo_fotos (
  id uuid primary key default gen_random_uuid(),
  rdo_id uuid not null references rdos (id) on delete cascade,
  storage_path text not null,
  legenda text not null,
  atividade_id uuid references rdo_atividades (id) on delete set null,
  ocorrencia_id uuid references rdo_ocorrencias (id) on delete set null,
  autor_id uuid not null references perfis (id),
  capturada_em timestamptz,
  comprimida boolean not null default false,
  created_at timestamptz not null default now(),
  constraint rdo_fotos_legenda_minima check (char_length(trim(legenda)) >= 5)
);

create index rdo_fotos_rdo_idx on rdo_fotos (rdo_id);

-- -----------------------------------------------------------------------------
-- Colaboração, assinatura e rastro
-- -----------------------------------------------------------------------------

create table comentarios (
  id uuid primary key default gen_random_uuid(),
  rdo_id uuid not null references rdos (id) on delete cascade,
  autor_id uuid not null references perfis (id),
  alvo_tipo text not null default 'rdo',
  alvo_id uuid,
  texto text not null check (char_length(trim(texto)) > 0),
  created_at timestamptz not null default now(),
  constraint comentarios_alvo_valido check (
    alvo_tipo in ('rdo', 'atividade', 'ocorrencia', 'foto')
  )
);

create index comentarios_rdo_idx on comentarios (rdo_id, created_at);

create table assinaturas (
  id uuid primary key default gen_random_uuid(),
  rdo_id uuid not null references rdos (id) on delete cascade,
  usuario_id uuid not null references perfis (id),
  tipo tipo_assinatura not null,
  ressalva text,
  versao integer not null,
  declaracao_texto text not null,
  dispositivo text,
  created_at timestamptz not null default now(),
  constraint assinaturas_ressalva_obrigatoria check (
    tipo <> 'ciencia_cliente_com_ressalva'
    or char_length(trim(coalesce(ressalva, ''))) > 0
  )
);

create index assinaturas_rdo_idx on assinaturas (rdo_id, created_at);

create table notificacoes (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references perfis (id) on delete cascade,
  rdo_id uuid references rdos (id) on delete cascade,
  tipo text not null,
  titulo text not null,
  corpo text,
  lida boolean not null default false,
  created_at timestamptz not null default now()
);

create index notificacoes_usuario_idx on notificacoes (usuario_id, lida, created_at desc);

create table rdo_versoes (
  id uuid primary key default gen_random_uuid(),
  rdo_id uuid not null references rdos (id) on delete cascade,
  versao integer not null,
  snapshot jsonb not null,
  created_at timestamptz not null default now(),
  constraint rdo_versoes_unica unique (rdo_id, versao)
);

create table auditoria (
  id bigserial primary key,
  empresa_id uuid,
  ator_id uuid,
  acao text not null,
  tabela text not null,
  registro_id uuid,
  antes jsonb,
  depois jsonb,
  created_at timestamptz not null default now()
);

create index auditoria_empresa_idx on auditoria (empresa_id, created_at desc);
create index auditoria_registro_idx on auditoria (tabela, registro_id);
