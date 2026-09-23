import { supabase } from '@/lib/supabase';
import type { Tabelas } from '@/types/database';

export type FotoRemota = Tabelas<'rdo_fotos'> & { url: string | null };

/** Fotos do RDO já no servidor, cada uma com URL assinada válida por 1 hora. */
export async function listarFotosRemotas(rdoId: string): Promise<FotoRemota[]> {
  const { data, error } = await supabase
    .from('rdo_fotos')
    .select('*')
    .eq('rdo_id', rdoId)
    .order('created_at');
  if (error) throw error;
  if (data.length === 0) return [];

  const { data: urls } = await supabase.storage.from('rdo-fotos').createSignedUrls(
    data.map((f) => f.storage_path),
    3600,
  );

  return data.map((f) => ({
    ...f,
    url: urls?.find((u) => u.path === f.storage_path)?.signedUrl ?? null,
  }));
}

export async function removerFotoRemota(foto: Pick<FotoRemota, 'id' | 'storage_path'>) {
  const { error } = await supabase.from('rdo_fotos').delete().eq('id', foto.id);
  if (error) throw error;
  await supabase.storage.from('rdo-fotos').remove([foto.storage_path]);
}
