import { cores } from './tokens';

/** Status persistidos na coluna `rdos.status`. */
export type StatusRdo =
  | 'rascunho'
  | 'submetido'
  | 'em_analise'
  | 'validado'
  | 'enviado_cliente'
  | 'finalizado'
  | 'retificado'
  | 'cancelado';

/**
 * "devolvido" não existe no banco: é um RDO em `rascunho` com `devolucao_motivo`
 * preenchido. Existe só na interface, porque o usuário precisa distinguir os dois.
 */
export type StatusVisual = StatusRdo | 'devolvido';

type Aparencia = { rotulo: string; cor: string; fundo: string };

export const APARENCIA_STATUS: Record<StatusVisual, Aparencia> = {
  rascunho: { rotulo: 'Rascunho', cor: cores.textoSecundario, fundo: cores.superficieForte },
  devolvido: { rotulo: 'Devolvido', cor: cores.aviso, fundo: '#FDF3E3' },
  submetido: { rotulo: 'Submetido', cor: cores.primaria, fundo: '#E7EDF5' },
  em_analise: { rotulo: 'Em análise', cor: cores.primariaClara, fundo: '#E7EDF5' },
  validado: { rotulo: 'Validado', cor: cores.sucesso, fundo: '#E3F2EA' },
  enviado_cliente: { rotulo: 'Aguardando cliente', cor: '#7A5B00', fundo: '#FDF3D4' },
  finalizado: { rotulo: 'Finalizado', cor: cores.sucesso, fundo: '#E3F2EA' },
  retificado: { rotulo: 'Retificado', cor: cores.textoSecundario, fundo: cores.superficieForte },
  cancelado: { rotulo: 'Cancelado', cor: cores.erro, fundo: '#FBE9E7' },
};

export function statusVisual(status: StatusRdo, devolucaoMotivo?: string | null): StatusVisual {
  if (status === 'rascunho' && devolucaoMotivo) return 'devolvido';
  return status;
}
