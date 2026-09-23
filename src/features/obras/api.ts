import { traduzirErro } from '@/lib/erros';
import { supabase } from '@/lib/supabase';
import type { Database, Tabelas } from '@/types/database';

export type Obra = Tabelas<'obras'>;
export type Perfil = Tabelas<'perfis'>;
export type Papel = Database['public']['Enums']['papel_usuario'];
export type StatusRdo = Database['public']['Enums']['status_rdo'];

export type Membro = {
  obra_id: string;
  usuario_id: string;
  papel: Papel;
  perfis: Pick<Perfil, 'id' | 'nome' | 'email' | 'papel' | 'ativo'> | null;
};

export type ResumoRdo = {
  id: string;
  numero: number;
  data: string;
  status: StatusRdo;
  devolucao_motivo: string | null;
};

export type DadosObra = {
  nome: string;
  endereco: string | null;
  contrato: string | null;
  cliente_nome: string | null;
  inicio: string | null;
  fim_previsto: string | null;
};

function estourar(erro: unknown): never {
  throw new Error(traduzirErro(erro));
}

export async function listarObras(): Promise<Obra[]> {
  const { data, error } = await supabase
    .from('obras')
    .select('*')
    .order('ativa', { ascending: false })
    .order('nome');

  if (error) estourar(error);
  return data;
}

export async function buscarObra(id: string): Promise<Obra> {
  const { data, error } = await supabase.from('obras').select('*').eq('id', id).single();
  if (error) estourar(error);
  return data;
}

export async function criarObra(dados: DadosObra): Promise<Obra> {
  const { data, error } = await supabase.rpc('obra_criar', {
    p_nome: dados.nome,
    p_endereco: dados.endereco ?? '',
    p_contrato: dados.contrato ?? '',
    p_cliente_nome: dados.cliente_nome ?? '',
    // Os tipos gerados não marcam argumentos como anuláveis, mas o Postgres
    // aceita null em parâmetro de função — e data vazia precisa chegar assim.
    p_inicio: dados.inicio as string,
    p_fim_previsto: dados.fim_previsto as string,
  });

  if (error) estourar(error);
  return data;
}

export async function atualizarObra(id: string, dados: DadosObra): Promise<Obra> {
  const { data, error } = await supabase.from('obras').update(dados).eq('id', id).select().single();

  if (error) estourar(error);
  return data;
}

/** Obra sai de circulação por `ativa = false` — não existe exclusão. */
export async function definirObraAtiva(id: string, ativa: boolean): Promise<void> {
  const { error } = await supabase.from('obras').update({ ativa }).eq('id', id);
  if (error) estourar(error);
}

export async function listarMembros(obraId: string): Promise<Membro[]> {
  const { data, error } = await supabase
    .from('obra_membros')
    .select('obra_id, usuario_id, papel, perfis(id, nome, email, papel, ativo)')
    .eq('obra_id', obraId);

  if (error) estourar(error);
  return data;
}

/** Usuários da empresa disponíveis para vincular. */
export async function listarPerfisDaEmpresa(): Promise<Perfil[]> {
  const { data, error } = await supabase.from('perfis').select('*').eq('ativo', true).order('nome');

  if (error) estourar(error);
  return data;
}

export async function vincularMembro(
  obraId: string,
  usuarioId: string,
  papel: Papel,
): Promise<void> {
  const { error } = await supabase
    .from('obra_membros')
    .upsert({ obra_id: obraId, usuario_id: usuarioId, papel });

  if (error) estourar(error);
}

export async function desvincularMembro(obraId: string, usuarioId: string): Promise<void> {
  const { error } = await supabase
    .from('obra_membros')
    .delete()
    .eq('obra_id', obraId)
    .eq('usuario_id', usuarioId);

  if (error) estourar(error);
}

export async function listarRdosDaObra(obraId: string): Promise<ResumoRdo[]> {
  const { data, error } = await supabase
    .from('rdos')
    .select('id, numero, data, status, devolucao_motivo')
    .eq('obra_id', obraId)
    .order('numero', { ascending: false })
    .limit(30);

  if (error) estourar(error);
  return data;
}
