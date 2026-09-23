import { traduzirErro } from '@/lib/erros';
import { supabase } from '@/lib/supabase';
import type { StatusRdo, Turno } from '@/features/rdo/tipos';

export type ItemCaixa = {
  id: string;
  numero: number;
  data: string;
  turno: Turno;
  status: StatusRdo;
  devolucao_motivo: string | null;
  versao: number;
  obra_id: string;
  submetido_em: string | null;
  obras: { nome: string } | null;
  perfis: { nome: string } | null;
};

export type FiltroCaixa = 'pendentes' | 'devolvidos' | 'cliente' | 'finalizados' | 'todos';

export const FILTROS: { valor: FiltroCaixa; rotulo: string }[] = [
  { valor: 'pendentes', rotulo: 'Para analisar' },
  { valor: 'devolvidos', rotulo: 'Devolvidos' },
  { valor: 'cliente', rotulo: 'Aguardando cliente' },
  { valor: 'finalizados', rotulo: 'Finalizados' },
  { valor: 'todos', rotulo: 'Todos' },
];

/** A RLS já limita às obras do usuário; o Cliente só recebe liberados. */
export async function listarCaixa(filtro: FiltroCaixa): Promise<ItemCaixa[]> {
  let consulta = supabase
    .from('rdos')
    .select(
      'id, numero, data, turno, status, devolucao_motivo, versao, obra_id, submetido_em, obras(nome), perfis(nome)',
    )
    .order('data', { ascending: false })
    .order('numero', { ascending: false })
    .limit(100);

  switch (filtro) {
    case 'pendentes':
      consulta = consulta.in('status', ['submetido', 'em_analise']);
      break;
    case 'devolvidos':
      consulta = consulta.eq('status', 'rascunho').not('devolucao_motivo', 'is', null);
      break;
    case 'cliente':
      consulta = consulta.eq('status', 'enviado_cliente');
      break;
    case 'finalizados':
      consulta = consulta.eq('status', 'finalizado');
      break;
  }

  const { data, error } = await consulta;
  if (error) throw new Error(traduzirErro(error));
  return data;
}
