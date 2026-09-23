import * as Crypto from 'expo-crypto';

import { hojeNaObra } from '@/lib/datas';
import type {
  ClimaPeriodo,
  LinhaAtividade,
  LinhaEquipamento,
  LinhaMaoObra,
  LinhaOcorrencia,
  LinhaPendencia,
  Periodo,
  RascunhoRdo,
  Turno,
} from './tipos';

export const novoId = (): string => Crypto.randomUUID();

export function criarRascunho(
  obraId: string,
  obraNome: string,
  turno: Turno = 'integral',
): RascunhoRdo {
  return {
    id: novoId(),
    obra_id: obraId,
    obra_nome: obraNome,
    numero: null,
    data: hojeNaObra(),
    turno,
    sem_producao: false,
    sem_producao_justificativa: '',
    declaracao_aceita: false,
    devolucao_motivo: null,
    clima: [],
    mao_obra: [],
    equipamentos: [],
    atividades: [],
    ocorrencias: [],
    pendencias: [],
  };
}

export const novaLinha = {
  clima: (periodo: Periodo): ClimaPeriodo => ({
    id: novoId(),
    periodo,
    condicao: 'sol',
    temperatura_c: null,
    choveu: false,
    chuva_duracao_min: null,
    chuva_impacto: '',
    precipitacao_mm: null,
    horas_paralisadas: null,
  }),
  maoObra: (): LinhaMaoObra => ({ id: novoId(), equipe: '', funcao: '', quantidade: 1, horas: 8 }),
  equipamento: (): LinhaEquipamento => ({
    id: novoId(),
    tipo: '',
    identificacao: '',
    quantidade: 1,
    horas_produtivas: 8,
    horas_paradas: 0,
    motivo_parada: '',
    operador: '',
  }),
  atividade: (): LinhaAtividade => ({
    id: novoId(),
    local: '',
    servico: '',
    descricao: '',
    unidade: '',
    quantidade_dia: null,
    percentual: null,
    situacao: 'Em andamento',
  }),
  ocorrencia: (): LinhaOcorrencia => ({
    id: novoId(),
    descricao: '',
    horario: '',
    impacto: '',
    acao_imediata: '',
    responsavel: '',
  }),
  pendencia: (): LinhaPendencia => ({
    id: novoId(),
    descricao: '',
    responsavel: '',
    prazo: null,
    criticidade: 'Média',
  }),
};

export function totalHomemHora(r: Pick<RascunhoRdo, 'mao_obra'>): number {
  return r.mao_obra.reduce((soma, l) => soma + (l.quantidade || 0) * (l.horas || 0), 0);
}

export function totalTrabalhadores(r: Pick<RascunhoRdo, 'mao_obra'>): number {
  return r.mao_obra.reduce((soma, l) => soma + (l.quantidade || 0), 0);
}
