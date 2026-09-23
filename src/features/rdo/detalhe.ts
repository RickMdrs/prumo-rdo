import { listarFotosRemotas, type FotoRemota } from '@/features/fotos/api';
import { traduzirErro } from '@/lib/erros';
import { supabase } from '@/lib/supabase';
import type { Tabelas } from '@/types/database';

export type Comentario = Tabelas<'comentarios'> & {
  perfis: { nome: string; papel: string } | null;
};
export type Assinatura = Tabelas<'assinaturas'> & {
  perfis: { nome: string; papel: string } | null;
};

export type RdoCompleto = {
  rdo: Tabelas<'rdos'>;
  obra: Pick<Tabelas<'obras'>, 'id' | 'nome' | 'contrato' | 'cliente_nome' | 'endereco'>;
  autor: { nome: string } | null;
  clima: Tabelas<'rdo_clima'>[];
  maoObra: Tabelas<'rdo_mao_obra'>[];
  equipamentos: Tabelas<'rdo_equipamentos'>[];
  atividades: Tabelas<'rdo_atividades'>[];
  ocorrencias: Tabelas<'rdo_ocorrencias'>[];
  pendencias: Tabelas<'rdo_pendencias'>[];
  fotos: FotoRemota[];
  comentarios: Comentario[];
  assinaturas: Assinatura[];
  /** Retificações feitas a partir deste RDO (a versão nova aponta para cá). */
  versoesPosteriores: { id: string; numero: number; versao: number; status: string }[];
};

export type LinhaAuditoria = {
  id: number;
  quando: string;
  acao: string;
  tabela: string;
  ator: string;
  antes: Record<string, unknown> | null;
  depois: Record<string, unknown> | null;
};

/** Só o Master recebe linhas — a RLS de `auditoria` devolve vazio para os demais. */
export async function buscarAuditoria(rdoId: string): Promise<LinhaAuditoria[]> {
  const { data, error } = await supabase.rpc('rdo_auditoria', { p_rdo_id: rdoId });
  if (error) throw new Error(traduzirErro(error));
  return (data ?? []) as unknown as LinhaAuditoria[];
}

function ou<T>(resposta: { data: T[] | null; error: unknown }): T[] {
  if (resposta.error) throw new Error(traduzirErro(resposta.error));
  return resposta.data ?? [];
}

/** Tudo que o detalhe, a linha do tempo e o PDF precisam, numa ida só. */
export async function buscarRdoCompleto(id: string): Promise<RdoCompleto> {
  const { data: rdo, error } = await supabase
    .from('rdos')
    .select('*, obras(id, nome, contrato, cliente_nome, endereco), perfis(nome)')
    .eq('id', id)
    .single();
  if (error) throw new Error(traduzirErro(error));

  const [cl, mo, eq, at, oc, pd, cm, as, fotos, posteriores] = await Promise.all([
    supabase.from('rdo_clima').select('*').eq('rdo_id', id),
    supabase.from('rdo_mao_obra').select('*').eq('rdo_id', id).order('created_at'),
    supabase.from('rdo_equipamentos').select('*').eq('rdo_id', id).order('created_at'),
    supabase.from('rdo_atividades').select('*').eq('rdo_id', id).order('created_at'),
    supabase.from('rdo_ocorrencias').select('*').eq('rdo_id', id).order('created_at'),
    supabase.from('rdo_pendencias').select('*').eq('rdo_id', id).order('created_at'),
    supabase
      .from('comentarios')
      .select('*, perfis(nome, papel)')
      .eq('rdo_id', id)
      .order('created_at'),
    supabase
      .from('assinaturas')
      .select('*, perfis(nome, papel)')
      .eq('rdo_id', id)
      .order('created_at'),
    listarFotosRemotas(id),
    supabase
      .from('rdos')
      .select('id, numero, versao, status')
      .eq('rdo_origem_id', id)
      .order('versao'),
  ]);

  const ordemPeriodo = { manha: 0, tarde: 1, noite: 2 } as Record<string, number>;

  const { obras, perfis, ...somenteRdo } = rdo;

  return {
    rdo: somenteRdo,
    obra: obras!,
    autor: perfis,
    clima: ou(cl).sort((a, b) => (ordemPeriodo[a.periodo] ?? 9) - (ordemPeriodo[b.periodo] ?? 9)),
    maoObra: ou(mo),
    equipamentos: ou(eq),
    atividades: ou(at),
    ocorrencias: ou(oc),
    pendencias: ou(pd),
    fotos,
    comentarios: ou(cm),
    assinaturas: ou(as),
    versoesPosteriores: ou(posteriores),
  };
}
