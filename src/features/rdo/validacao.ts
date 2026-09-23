import { hojeNaObra } from '@/lib/datas';
import type { RascunhoRdo } from './tipos';

/**
 * Espelho das regras do banco, só para dar a mensagem antes do envio. Quem
 * decide de verdade continua sendo o banco: CHECKs da 001 e rdo_submeter da 005.
 */

export const ETAPAS = [
  'Identificação',
  'Clima',
  'Mão de obra',
  'Equipamentos',
  'Atividades',
  'Ocorrências e pendências',
  'Fotos',
  'Revisão',
] as const;

const NOME_PERIODO = { manha: 'manhã', tarde: 'tarde', noite: 'noite' } as const;

function horarioValido(h: string): boolean {
  const m = /^(\d{1,2}):(\d{2})$/.exec(h.trim());
  if (!m) return false;
  return Number(m[1]) < 24 && Number(m[2]) < 60;
}

/** Problemas que impedem sair da etapa. Índice 0 = Identificação. */
export function problemasDaEtapa(r: RascunhoRdo, etapa: number): string[] {
  const p: string[] = [];

  switch (etapa) {
    case 0:
      if (!r.obra_id) p.push('Escolha a obra.');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(r.data)) p.push('Informe uma data válida.');
      else if (r.data > hojeNaObra()) p.push('A data do RDO não pode ser no futuro.');
      break;

    case 1:
      for (const c of r.clima) {
        const nome = NOME_PERIODO[c.periodo];
        if (c.choveu && !(c.chuva_duracao_min && c.chuva_duracao_min > 0)) {
          p.push(`Choveu na ${nome}: informe a duração da chuva em minutos.`);
        }
        if (c.choveu && c.chuva_impacto.trim().length === 0) {
          p.push(`Choveu na ${nome}: descreva o impacto da chuva na obra.`);
        }
        if (c.horas_paralisadas !== null && (c.horas_paralisadas < 0 || c.horas_paralisadas > 24)) {
          p.push(`Horas paralisadas da ${nome} devem ficar entre 0 e 24.`);
        }
      }
      break;

    case 2:
      r.mao_obra.forEach((l, i) => {
        const n = i + 1;
        if (!l.funcao.trim()) p.push(`Mão de obra, linha ${n}: informe a função.`);
        if (!(l.quantidade > 0))
          p.push(`Mão de obra, linha ${n}: quantidade precisa ser maior que zero.`);
        if (!(l.horas >= 0 && l.horas <= 24))
          p.push(`Mão de obra, linha ${n}: horas entre 0 e 24.`);
      });
      break;

    case 3:
      r.equipamentos.forEach((e, i) => {
        const n = i + 1;
        if (!e.tipo.trim()) p.push(`Equipamento ${n}: informe o tipo.`);
        if (!(e.quantidade > 0)) p.push(`Equipamento ${n}: quantidade precisa ser maior que zero.`);
        if (e.horas_paradas > 0 && !e.motivo_parada.trim()) {
          p.push(`Equipamento ${n} ficou parado: informe o motivo da parada.`);
        }
      });
      break;

    case 4:
      if (r.sem_producao) {
        if (r.sem_producao_justificativa.trim().length < 10) {
          p.push('Justifique o dia sem produção (mínimo de 10 caracteres).');
        }
      } else {
        r.atividades.forEach((a, i) => {
          const n = i + 1;
          if (!a.servico.trim()) p.push(`Atividade ${n}: informe o serviço.`);
          if (a.percentual !== null && (a.percentual < 0 || a.percentual > 100)) {
            p.push(`Atividade ${n}: percentual entre 0 e 100.`);
          }
        });
      }
      break;

    case 5:
      r.ocorrencias.forEach((o, i) => {
        if (!o.descricao.trim()) p.push(`Ocorrência ${i + 1}: descreva o que aconteceu.`);
        if (o.horario.trim() && !horarioValido(o.horario)) {
          p.push(`Ocorrência ${i + 1}: horário no formato HH:MM.`);
        }
      });
      r.pendencias.forEach((pd, i) => {
        if (!pd.descricao.trim()) p.push(`Pendência ${i + 1}: descreva a pendência.`);
      });
      break;
  }

  return p;
}

export type Falta = { etapa: number; mensagem: string };

/** A lista exata do que falta para submeter — regra 8 mais os campos de cada etapa. */
export function faltasParaSubmeter(r: RascunhoRdo): Falta[] {
  const faltas: Falta[] = [];

  for (let etapa = 0; etapa <= 5; etapa++) {
    for (const mensagem of problemasDaEtapa(r, etapa)) faltas.push({ etapa, mensagem });
  }

  if (r.clima.length === 0) {
    faltas.push({ etapa: 1, mensagem: 'Registre o clima de pelo menos um período.' });
  }

  if (!r.sem_producao && r.atividades.length === 0) {
    faltas.push({
      etapa: 4,
      mensagem: 'Registre ao menos uma atividade ou marque o dia como sem produção.',
    });
  }

  if (!r.declaracao_aceita) {
    faltas.push({ etapa: 7, mensagem: 'Aceite a declaração de responsabilidade.' });
  }

  return faltas;
}
