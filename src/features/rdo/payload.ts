import type { RascunhoRdo } from './tipos';

/** Horário da ocorrência é digitado como HH:MM; o banco quer timestamptz. */
function horarioParaTimestamp(data: string, horario: string): string | null {
  const limpo = horario.trim();
  if (!/^\d{1,2}:\d{2}$/.test(limpo)) return null;
  const [h, m] = limpo.split(':');
  return `${data}T${h!.padStart(2, '0')}:${m}:00-03:00`;
}

/**
 * Converte o rascunho local no payload de `rdo_salvar_rascunho`. Fica fora de
 * sync.ts, sem dependência nativa, para os testes de integração usarem o
 * mesmo formato que o app envia.
 */
export function montarPayload(r: RascunhoRdo) {
  return {
    rdo: {
      data: r.data,
      turno: r.turno,
      sem_producao_justificativa: r.sem_producao ? r.sem_producao_justificativa : '',
      declaracao_aceita: r.declaracao_aceita,
    },
    clima: r.clima.map((c) => ({
      ...c,
      chuva_duracao_min: c.choveu ? c.chuva_duracao_min : null,
      chuva_impacto: c.choveu ? c.chuva_impacto : '',
    })),
    mao_obra: r.mao_obra,
    equipamentos: r.equipamentos.map((e) => ({
      ...e,
      motivo_parada: e.horas_paradas > 0 ? e.motivo_parada : '',
    })),
    atividades: r.sem_producao ? [] : r.atividades,
    ocorrencias: r.ocorrencias.map((o) => ({
      ...o,
      horario: horarioParaTimestamp(r.data, o.horario),
    })),
    pendencias: r.pendencias,
  };
}
