import type { Database } from '@/types/database';

export type Turno = Database['public']['Enums']['turno'];
export type CondicaoTempo = Database['public']['Enums']['condicao_tempo'];
export type StatusRdo = Database['public']['Enums']['status_rdo'];
export type Periodo = 'manha' | 'tarde' | 'noite';

export type ClimaPeriodo = {
  id: string;
  periodo: Periodo;
  condicao: CondicaoTempo;
  temperatura_c: number | null;
  choveu: boolean;
  chuva_duracao_min: number | null;
  chuva_impacto: string;
  precipitacao_mm: number | null;
  horas_paralisadas: number | null;
};

export type LinhaMaoObra = {
  id: string;
  equipe: string;
  funcao: string;
  quantidade: number;
  horas: number;
};

export type LinhaEquipamento = {
  id: string;
  tipo: string;
  identificacao: string;
  quantidade: number;
  horas_produtivas: number;
  horas_paradas: number;
  motivo_parada: string;
  operador: string;
};

export type LinhaAtividade = {
  id: string;
  local: string;
  servico: string;
  descricao: string;
  unidade: string;
  quantidade_dia: number | null;
  percentual: number | null;
  situacao: string;
};

export type LinhaOcorrencia = {
  id: string;
  descricao: string;
  horario: string;
  impacto: string;
  acao_imediata: string;
  responsavel: string;
};

export type LinhaPendencia = {
  id: string;
  descricao: string;
  responsavel: string;
  prazo: string | null;
  criticidade: string;
};

/**
 * O RDO como ele existe no aparelho. É salvo inteiro em `rdos_locais.payload`
 * a cada mudança e enviado inteiro para `rdo_salvar_rascunho`. Os ids de cada
 * linha nascem aqui e vão para o banco, então uma foto vinculada a uma
 * atividade continua vinculada depois de qualquer número de salvamentos.
 */
export type RascunhoRdo = {
  id: string;
  obra_id: string;
  obra_nome: string;
  numero: number | null;
  data: string;
  turno: Turno;
  sem_producao: boolean;
  sem_producao_justificativa: string;
  declaracao_aceita: boolean;
  devolucao_motivo: string | null;
  clima: ClimaPeriodo[];
  mao_obra: LinhaMaoObra[];
  equipamentos: LinhaEquipamento[];
  atividades: LinhaAtividade[];
  ocorrencias: LinhaOcorrencia[];
  pendencias: LinhaPendencia[];
};

export type StatusSync = 'pendente' | 'sincronizando' | 'sincronizado' | 'erro';
