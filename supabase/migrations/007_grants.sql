-- =============================================================================
-- Prumo RDO — 007: privilégios de tabela
--
-- GRANT e RLS são camadas diferentes. O GRANT diz se o papel pode sequer tocar
-- na tabela; a RLS diz quais linhas ele enxerga. Sem o GRANT, o Postgres
-- responde "permission denied" antes de avaliar qualquer política.
--
-- Aqui as duas camadas se reforçam: além de não existir política de DELETE em
-- `rdos` nem de escrita em `auditoria`, o privilégio também é removido.
-- =============================================================================

grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant all on all routines in schema public to service_role;

-- Reforço no nível do privilégio -------------------------------------------
revoke delete on rdos from authenticated;
revoke insert, update, delete on auditoria from authenticated;
revoke update, delete on assinaturas from authenticated;
revoke insert, update, delete on rdo_versoes from authenticated;
revoke update, delete on comentarios from authenticated;
revoke insert, update, delete on empresas from authenticated;
revoke insert, update, delete on perfis from authenticated;
revoke delete on obras from authenticated;
revoke insert, delete on notificacoes from authenticated;

-- anon não fala com o domínio: o app exige sessão para tudo.
revoke all on all tables in schema public from anon;

-- Tabelas criadas depois desta migração herdam o mesmo desenho.
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;

alter default privileges in schema public
  grant all on tables to service_role;

alter default privileges in schema public
  grant usage, select on sequences to authenticated, service_role;
