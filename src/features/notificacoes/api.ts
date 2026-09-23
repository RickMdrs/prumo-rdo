import { traduzirErro } from '@/lib/erros';
import { supabase } from '@/lib/supabase';
import type { Tabelas } from '@/types/database';

export type Notificacao = Tabelas<'notificacoes'>;

export async function listarNotificacoes(): Promise<Notificacao[]> {
  const { data, error } = await supabase
    .from('notificacoes')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw new Error(traduzirErro(error));
  return data;
}

export async function contarNaoLidas(): Promise<number> {
  const { count, error } = await supabase
    .from('notificacoes')
    .select('id', { count: 'exact', head: true })
    .eq('lida', false);
  if (error) return 0;
  return count ?? 0;
}

export async function marcarLida(id: string): Promise<void> {
  const { error } = await supabase.from('notificacoes').update({ lida: true }).eq('id', id);
  if (error) throw new Error(traduzirErro(error));
}

export async function marcarTodasLidas(usuarioId: string): Promise<void> {
  const { error } = await supabase
    .from('notificacoes')
    .update({ lida: true })
    .eq('usuario_id', usuarioId)
    .eq('lida', false);
  if (error) throw new Error(traduzirErro(error));
}
