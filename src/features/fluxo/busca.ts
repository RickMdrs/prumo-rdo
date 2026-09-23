import { traduzirErro } from '@/lib/erros';
import { supabase } from '@/lib/supabase';
import type { StatusRdo } from '@/features/rdo/tipos';
import type { ItemCaixa } from './caixa';

export type FiltrosBusca = {
  obraId: string | null;
  de: string | null;
  ate: string | null;
  numero: number | null;
  status: StatusRdo | 'devolvido' | null;
};

/** Busca livre sobre os RDOs que a RLS deixa o usuário ver. */
export async function buscarRdos(f: FiltrosBusca): Promise<ItemCaixa[]> {
  let q = supabase
    .from('rdos')
    .select(
      'id, numero, data, turno, status, devolucao_motivo, versao, obra_id, submetido_em, obras(nome), perfis(nome)',
    )
    .order('data', { ascending: false })
    .order('numero', { ascending: false })
    .limit(200);

  if (f.obraId) q = q.eq('obra_id', f.obraId);
  if (f.de) q = q.gte('data', f.de);
  if (f.ate) q = q.lte('data', f.ate);
  if (f.numero !== null) q = q.eq('numero', f.numero);

  if (f.status === 'devolvido') {
    q = q.eq('status', 'rascunho').not('devolucao_motivo', 'is', null);
  } else if (f.status) {
    q = q.eq('status', f.status);
  }

  const { data, error } = await q;
  if (error) throw new Error(traduzirErro(error));
  return data;
}
