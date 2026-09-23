-- =============================================================================
-- Prumo RDO — 010: notificações em tempo real
--
-- Push remoto não funciona no Expo Go. O desenho da seção 2 contorna isso: as
-- funções da 005 gravam em `notificacoes`, o app escuta esta tabela pelo
-- Realtime e dispara uma notificação LOCAL. O Realtime respeita a RLS de
-- leitura, então cada aparelho só recebe as linhas do próprio usuário.
-- =============================================================================

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notificacoes'
  ) then
    alter publication supabase_realtime add table notificacoes;
  end if;
end
$$;
