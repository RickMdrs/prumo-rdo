-- =============================================================================
-- Prumo RDO — 006: buckets privados e políticas de Storage
--
-- Convenção de caminho: {obra_id}/{rdo_id}/{arquivo}
-- A permissão sai do primeiro segmento: quem não é membro da obra não lê o
-- arquivo nem com a URL na mão.
-- =============================================================================

insert into storage.buckets (id, name, public)
values ('rdo-fotos', 'rdo-fotos', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('rdo-pdfs', 'rdo-pdfs', false)
on conflict (id) do nothing;

-- Segmentos do caminho, tolerantes a lixo: devolvem null em vez de estourar
-- quando alguém envia um nome fora do padrão.
create or replace function fn_obra_do_caminho(p_name text)
returns uuid
language sql
immutable
as $$
  select case
    when split_part(p_name, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then split_part(p_name, '/', 1)::uuid
  end;
$$;

create or replace function fn_rdo_do_caminho(p_name text)
returns uuid
language sql
immutable
as $$
  select case
    when split_part(p_name, '/', 2) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then split_part(p_name, '/', 2)::uuid
  end;
$$;

-- -----------------------------------------------------------------------------
-- rdo-fotos
-- -----------------------------------------------------------------------------

create policy rdo_fotos_storage_leitura on storage.objects
  for select to authenticated
  using (
    bucket_id = 'rdo-fotos'
    and fn_rdo_visivel(fn_rdo_do_caminho(name))
  );

create policy rdo_fotos_storage_envio on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'rdo-fotos'
    and fn_rdo_editavel(fn_rdo_do_caminho(name))
  );

create policy rdo_fotos_storage_remocao on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'rdo-fotos'
    and fn_rdo_editavel(fn_rdo_do_caminho(name))
  );

-- -----------------------------------------------------------------------------
-- rdo-pdfs — o PDF é gerado no aparelho e enviado depois de finalizado.
-- Nunca se apaga: o hash registrado em rdos.pdf_hash precisa continuar
-- apontando para um arquivo existente.
-- -----------------------------------------------------------------------------

create policy rdo_pdfs_storage_leitura on storage.objects
  for select to authenticated
  using (
    bucket_id = 'rdo-pdfs'
    and fn_rdo_visivel(fn_rdo_do_caminho(name))
  );

create policy rdo_pdfs_storage_envio on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'rdo-pdfs'
    and fn_eh_membro(fn_obra_do_caminho(name))
    and exists (
      select 1 from rdos r
      where r.id = fn_rdo_do_caminho(name)
        and r.status = 'finalizado'
        and r.pdf_hash is null
    )
  );
