import type { Feather } from '@expo/vector-icons';

import type { RdoCompleto } from '@/features/rdo/detalhe';

export type Evento = {
  quando: string;
  titulo: string;
  detalhe?: string;
  icone: keyof typeof Feather.glyphMap;
  cor: 'primaria' | 'sucesso' | 'aviso' | 'erro' | 'neutra';
};

const TIPO_ASSINATURA = {
  validacao_master: 'Validado e assinado pelo responsável técnico',
  ciencia_cliente: 'Ciência do cliente',
  ciencia_cliente_com_ressalva: 'Ciência do cliente com ressalva',
} as const;

/**
 * Quem fez o quê e quando, a partir do que o banco guarda: datas de
 * transição em `rdos`, assinaturas e comentários. O histórico completo de
 * cada alteração (inclusive devoluções anteriores) fica em `auditoria`.
 */
export function montarLinhaDoTempo(d: RdoCompleto): Evento[] {
  const eventos: Evento[] = [
    {
      quando: d.rdo.created_at,
      titulo: `Criado por ${d.autor?.nome ?? 'autor'}`,
      detalhe:
        d.rdo.versao > 1
          ? `Versão ${d.rdo.versao} — retificação: ${d.rdo.motivo_retificacao ?? ''}`
          : undefined,
      icone: 'file-plus',
      cor: 'neutra',
    },
  ];

  if (d.rdo.submetido_em) {
    eventos.push({
      quando: d.rdo.submetido_em,
      titulo: 'Submetido para análise',
      icone: 'send',
      cor: 'primaria',
    });
  }

  if (d.rdo.status === 'rascunho' && d.rdo.devolucao_motivo) {
    eventos.push({
      quando: d.rdo.updated_at,
      titulo: 'Devolvido para correção',
      detalhe: d.rdo.devolucao_motivo,
      icone: 'corner-up-left',
      cor: 'aviso',
    });
  }

  for (const a of d.assinaturas) {
    eventos.push({
      quando: a.created_at,
      titulo: `${TIPO_ASSINATURA[a.tipo]} — ${a.perfis?.nome ?? ''}`,
      detalhe: a.ressalva ? `Ressalva: ${a.ressalva}` : (a.dispositivo ?? undefined),
      icone: a.tipo === 'ciencia_cliente_com_ressalva' ? 'alert-octagon' : 'edit-3',
      cor: a.tipo === 'ciencia_cliente_com_ressalva' ? 'aviso' : 'sucesso',
    });
  }

  for (const c of d.comentarios) {
    eventos.push({
      quando: c.created_at,
      titulo: `Comentário de ${c.perfis?.nome ?? ''}`,
      detalhe: c.texto,
      icone: 'message-square',
      cor: 'neutra',
    });
  }

  if (d.rdo.cancelado_em) {
    eventos.push({
      quando: d.rdo.cancelado_em,
      titulo: 'Cancelado',
      detalhe: d.rdo.cancelamento_motivo ?? undefined,
      icone: 'x-octagon',
      cor: 'erro',
    });
  }

  if (d.rdo.status === 'retificado') {
    eventos.push({
      quando: d.rdo.updated_at,
      titulo: 'Substituído por uma retificação',
      icone: 'git-branch',
      cor: 'neutra',
    });
  }

  return eventos.sort((a, b) => a.quando.localeCompare(b.quando));
}
