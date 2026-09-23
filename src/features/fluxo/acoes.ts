import { Platform } from 'react-native';

import { traduzirErro } from '@/lib/erros';
import { supabase } from '@/lib/supabase';

/** Vai junto com a assinatura: de qual aparelho ela partiu. */
export function descricaoDispositivo(): string {
  return `Prumo RDO · ${Platform.OS} ${String(Platform.Version)}`;
}

async function chamar<T>(promessa: PromiseLike<{ data: T; error: unknown }>): Promise<T> {
  const { data, error } = await promessa;
  if (error) throw new Error(traduzirErro(error));
  return data;
}

export const acoes = {
  iniciarAnalise: (id: string) => chamar(supabase.rpc('rdo_iniciar_analise', { p_rdo_id: id })),

  devolver: (id: string, motivo: string) =>
    chamar(supabase.rpc('rdo_devolver', { p_rdo_id: id, p_motivo: motivo })),

  validar: (id: string, declaracao: string) =>
    chamar(
      supabase.rpc('rdo_validar', {
        p_rdo_id: id,
        p_declaracao_texto: declaracao,
        p_dispositivo: descricaoDispositivo(),
      }),
    ),

  clienteAssinar: (id: string, comRessalva: boolean, ressalva: string, declaracao: string) =>
    chamar(
      supabase.rpc('rdo_cliente_assinar', {
        p_rdo_id: id,
        p_com_ressalva: comRessalva,
        p_ressalva: ressalva,
        p_declaracao_texto: declaracao,
        p_dispositivo: descricaoDispositivo(),
      }),
    ),

  pedirEsclarecimento: (id: string, texto: string) =>
    chamar(supabase.rpc('rdo_cliente_pedir_esclarecimento', { p_rdo_id: id, p_texto: texto })),

  retificar: (id: string, motivo: string) =>
    chamar(supabase.rpc('rdo_retificar', { p_rdo_id: id, p_motivo: motivo })),

  cancelar: (id: string, motivo: string) =>
    chamar(supabase.rpc('rdo_cancelar', { p_rdo_id: id, p_motivo: motivo })),

  comentar: async (
    rdoId: string,
    autorId: string,
    texto: string,
    alvo: { tipo: 'rdo' | 'atividade' | 'ocorrencia' | 'foto'; id: string | null },
  ) => {
    const { error } = await supabase.from('comentarios').insert({
      rdo_id: rdoId,
      autor_id: autorId,
      texto: texto.trim(),
      alvo_tipo: alvo.tipo,
      alvo_id: alvo.id,
    });
    if (error) throw new Error(traduzirErro(error));
  },
};
