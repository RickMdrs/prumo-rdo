-- =============================================================================
-- Prumo RDO — 003: Row Level Security
--
-- Ausência de política é proibição: o que não está escrito aqui, ninguém faz.
-- Por isso `rdos` não tem DELETE, `auditoria` não tem UPDATE nem DELETE, e
-- INSERT em `rdos` / `assinaturas` só acontece pelas funções da 005.
-- =============================================================================

alter table empresas enable row level security;
alter table perfis enable row level security;
alter table obras enable row level security;
alter table obra_membros enable row level security;
alter table rdos enable row level security;
alter table rdo_clima enable row level security;
alter table rdo_mao_obra enable row level security;
alter table rdo_equipamentos enable row level security;
alter table rdo_atividades enable row level security;
alter table rdo_ocorrencias enable row level security;
alter table rdo_pendencias enable row level security;
alter table rdo_fotos enable row level security;
alter table comentarios enable row level security;
alter table assinaturas enable row level security;
alter table notificacoes enable row level security;
alter table rdo_versoes enable row level security;
alter table auditoria enable row level security;

-- -----------------------------------------------------------------------------
-- empresas / perfis
-- -----------------------------------------------------------------------------

create policy empresas_leitura on empresas
  for select to authenticated
  using (id = fn_empresa_do_usuario());

create policy perfis_leitura on perfis
  for select to authenticated
  using (id = auth.uid() or empresa_id = fn_empresa_do_usuario());

-- -----------------------------------------------------------------------------
-- obras
-- -----------------------------------------------------------------------------

create policy obras_leitura on obras
  for select to authenticated
  using (fn_eh_membro(id));

create policy obras_insercao_master on obras
  for insert to authenticated
  with check (empresa_id = fn_empresa_do_usuario() and fn_eh_master_da_empresa());

create policy obras_atualizacao_master on obras
  for update to authenticated
  using (fn_papel_na_obra(id) = 'master')
  with check (empresa_id = fn_empresa_do_usuario());

-- Sem DELETE: obra sai de circulação por `ativa = false`.

-- -----------------------------------------------------------------------------
-- obra_membros
-- -----------------------------------------------------------------------------

create policy obra_membros_leitura on obra_membros
  for select to authenticated
  using (fn_eh_membro(obra_id));

create policy obra_membros_insercao on obra_membros
  for insert to authenticated
  with check (fn_papel_na_obra(obra_id) = 'master');

create policy obra_membros_atualizacao on obra_membros
  for update to authenticated
  using (fn_papel_na_obra(obra_id) = 'master')
  with check (fn_papel_na_obra(obra_id) = 'master');

create policy obra_membros_remocao on obra_membros
  for delete to authenticated
  using (fn_papel_na_obra(obra_id) = 'master');

-- -----------------------------------------------------------------------------
-- rdos
-- -----------------------------------------------------------------------------

create policy rdos_leitura on rdos
  for select to authenticated
  using (
    fn_eh_membro(obra_id)
    and (
      fn_papel_na_obra(obra_id) <> 'cliente'
      or status in ('enviado_cliente', 'finalizado')
    )
  );

-- Criação e transições passam pelas funções da 005. Aqui só o autor,
-- e só enquanto o RDO ainda é rascunho.
create policy rdos_atualizacao_autor on rdos
  for update to authenticated
  using (status = 'rascunho' and autor_id = auth.uid())
  with check (autor_id = auth.uid());

-- Sem INSERT e sem DELETE.

-- -----------------------------------------------------------------------------
-- Tabelas filhas: leitura por quem enxerga o RDO, escrita só pelo autor
-- enquanto o RDO é rascunho.
-- -----------------------------------------------------------------------------

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
      'create policy %1$s_leitura on %1$s for select to authenticated
         using (fn_rdo_visivel(rdo_id));', t);

    execute format(
      'create policy %1$s_insercao on %1$s for insert to authenticated
         with check (fn_rdo_editavel(rdo_id));', t);

    execute format(
      'create policy %1$s_atualizacao on %1$s for update to authenticated
         using (fn_rdo_editavel(rdo_id)) with check (fn_rdo_editavel(rdo_id));', t);

    execute format(
      'create policy %1$s_remocao on %1$s for delete to authenticated
         using (fn_rdo_editavel(rdo_id));', t);
  end loop;
end
$$;

-- -----------------------------------------------------------------------------
-- comentarios: qualquer membro que enxerga o RDO pode comentar.
-- Comentário não se edita nem se apaga — faz parte do rastro.
-- -----------------------------------------------------------------------------

create policy comentarios_leitura on comentarios
  for select to authenticated
  using (fn_rdo_visivel(rdo_id));

create policy comentarios_insercao on comentarios
  for insert to authenticated
  with check (fn_rdo_visivel(rdo_id) and autor_id = auth.uid());

-- -----------------------------------------------------------------------------
-- assinaturas e versões: leitura apenas. Gravação só pelas funções da 005.
-- -----------------------------------------------------------------------------

create policy assinaturas_leitura on assinaturas
  for select to authenticated
  using (fn_rdo_visivel(rdo_id));

create policy rdo_versoes_leitura on rdo_versoes
  for select to authenticated
  using (fn_rdo_visivel(rdo_id));

-- -----------------------------------------------------------------------------
-- notificacoes: cada um só enxerga e marca as suas.
-- -----------------------------------------------------------------------------

create policy notificacoes_leitura on notificacoes
  for select to authenticated
  using (usuario_id = auth.uid());

create policy notificacoes_atualizacao on notificacoes
  for update to authenticated
  using (usuario_id = auth.uid())
  with check (usuario_id = auth.uid());

-- -----------------------------------------------------------------------------
-- auditoria: leitura para o Master da empresa. Nada mais.
-- -----------------------------------------------------------------------------

create policy auditoria_leitura_master on auditoria
  for select to authenticated
  using (empresa_id = fn_empresa_do_usuario() and fn_eh_master_da_empresa());
