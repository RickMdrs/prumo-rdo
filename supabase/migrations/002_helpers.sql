-- =============================================================================
-- Prumo RDO — 002: funções auxiliares
--
-- Todas SECURITY DEFINER porque são chamadas de dentro das políticas de RLS:
-- se rodassem como o usuário, consultar obra_membros dispararia a própria
-- política que as chama, gerando recursão infinita.
-- =============================================================================

create or replace function fn_empresa_do_usuario()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select empresa_id from perfis where id = auth.uid() and ativo;
$$;

create or replace function fn_papel_na_obra(p_obra_id uuid)
returns papel_usuario
language sql
stable
security definer
set search_path = public
as $$
  select m.papel
  from obra_membros m
  join perfis p on p.id = m.usuario_id
  where m.obra_id = p_obra_id
    and m.usuario_id = auth.uid()
    and p.ativo;
$$;

create or replace function fn_eh_membro(p_obra_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select fn_papel_na_obra(p_obra_id) is not null;
$$;

create or replace function fn_eh_master_da_empresa()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from perfis
    where id = auth.uid() and papel = 'master' and ativo
  );
$$;

-- Um RDO é visível para membros da obra; para o Cliente, só depois de liberado.
create or replace function fn_rdo_visivel(p_rdo_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from rdos r
    where r.id = p_rdo_id
      and fn_eh_membro(r.obra_id)
      and (
        fn_papel_na_obra(r.obra_id) <> 'cliente'
        or r.status in ('enviado_cliente', 'finalizado')
      )
  );
$$;

-- Conteúdo só muda em rascunho e só pelo autor. É a regra 1 da seção 4,
-- usada tanto nas políticas de RLS quanto nos triggers das tabelas filhas.
create or replace function fn_rdo_editavel(p_rdo_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from rdos r
    where r.id = p_rdo_id
      and r.status = 'rascunho'
      and r.autor_id = auth.uid()
  );
$$;
