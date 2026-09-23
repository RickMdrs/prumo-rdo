import AsyncStorage from '@react-native-async-storage/async-storage';

import { listarRdosLocais, salvarRdoBaixado } from '@/lib/db-local';
import { traduzirErro } from '@/lib/erros';
import { supabase } from '@/lib/supabase';
import { novoId } from './rascunho';
import type { RascunhoRdo, StatusRdo, Turno } from './tipos';

export type ObraResumo = { id: string; nome: string };

const chaveCache = (usuarioId: string) => `prumo:obras:${usuarioId}`;

/**
 * Obras em que o usuário pode lançar RDO. Guardadas no aparelho a cada busca
 * bem-sucedida, porque o operacional precisa abrir um RDO novo em modo avião.
 */
export async function obrasDisponiveis(usuarioId: string): Promise<ObraResumo[]> {
  try {
    const { data, error } = await supabase
      .from('obras')
      .select('id, nome')
      .eq('ativa', true)
      .order('nome');
    if (error) throw error;
    await AsyncStorage.setItem(chaveCache(usuarioId), JSON.stringify(data));
    return data;
  } catch (erro) {
    const salvo = await AsyncStorage.getItem(chaveCache(usuarioId)).catch(() => null);
    if (salvo) return JSON.parse(salvo) as ObraResumo[];
    throw new Error(traduzirErro(erro));
  }
}

export type RdoRemoto = {
  id: string;
  numero: number;
  data: string;
  turno: Turno;
  status: StatusRdo;
  devolucao_motivo: string | null;
  obra_id: string;
  obras: { nome: string } | null;
};

export async function listarMeusRdosRemotos(autorId: string): Promise<RdoRemoto[]> {
  const { data, error } = await supabase
    .from('rdos')
    .select('id, numero, data, turno, status, devolucao_motivo, obra_id, obras(nome)')
    .eq('autor_id', autorId)
    .order('data', { ascending: false })
    .order('numero', { ascending: false })
    .limit(50);
  if (error) throw new Error(traduzirErro(error));
  return data;
}

/** Aviso (não bloqueio) de RDO da mesma obra, data e turno. */
export async function existeDuplicado(
  autorId: string,
  obraId: string,
  data: string,
  turno: Turno,
  ignorarId: string,
): Promise<boolean> {
  const locais = await listarRdosLocais(autorId);
  const local = locais.some(
    (l) =>
      l.id_local !== ignorarId &&
      l.rascunho.obra_id === obraId &&
      l.rascunho.data === data &&
      l.rascunho.turno === turno,
  );
  if (local) return true;

  try {
    const { count } = await supabase
      .from('rdos')
      .select('id', { count: 'exact', head: true })
      .eq('obra_id', obraId)
      .eq('data', data)
      .eq('turno', turno)
      .neq('id', ignorarId)
      .neq('status', 'cancelado');
    return (count ?? 0) > 0;
  } catch {
    return false;
  }
}

type Importado = Pick<RascunhoRdo, 'mao_obra' | 'equipamentos' | 'atividades'>;

const chaveAnterior = (obraId: string) => `prumo:anterior:${obraId}`;

/** Último RDO da obra no servidor, já no formato de importação. */
async function anteriorRemoto(obraId: string, ignorarId: string): Promise<Importado | null> {
  let consulta = supabase
    .from('rdos')
    .select('id')
    .eq('obra_id', obraId)
    .neq('status', 'cancelado')
    .order('data', { ascending: false })
    .order('numero', { ascending: false })
    .limit(1);
  if (ignorarId) consulta = consulta.neq('id', ignorarId);

  const { data: ultimo, error } = await consulta.maybeSingle();
  if (error) throw error;
  if (!ultimo) return null;

  const [mo, eq, at] = await Promise.all([
    supabase.from('rdo_mao_obra').select('*').eq('rdo_id', ultimo.id),
    supabase.from('rdo_equipamentos').select('*').eq('rdo_id', ultimo.id),
    supabase.from('rdo_atividades').select('*').eq('rdo_id', ultimo.id),
  ]);
  if (mo.error ?? eq.error ?? at.error) throw mo.error ?? eq.error ?? at.error;

  const modelo: Importado = {
    mao_obra: (mo.data ?? []).map((l) => ({
      id: '',
      equipe: l.equipe ?? '',
      funcao: l.funcao,
      quantidade: l.quantidade,
      horas: Number(l.horas),
    })),
    equipamentos: (eq.data ?? []).map((e) => ({
      id: '',
      tipo: e.tipo,
      identificacao: e.identificacao ?? '',
      quantidade: e.quantidade,
      horas_produtivas: Number(e.horas_produtivas),
      horas_paradas: 0,
      motivo_parada: '',
      operador: e.operador ?? '',
    })),
    atividades: (at.data ?? []).map((a) => ({
      id: '',
      local: a.local ?? '',
      servico: a.servico,
      descricao: '',
      unidade: a.unidade ?? '',
      quantidade_dia: null,
      percentual: null,
      situacao: 'Em andamento',
    })),
  };

  await AsyncStorage.setItem(chaveAnterior(obraId), JSON.stringify(modelo)).catch(() => undefined);
  return modelo;
}

/**
 * Guarda no aparelho o modelo do último RDO de cada obra, para o "Importar
 * do RDO anterior" funcionar também em modo avião. Chamado ao abrir Novo RDO.
 */
export async function prepararImportacaoOffline(obraIds: string[]): Promise<void> {
  await Promise.all(obraIds.map((id) => anteriorRemoto(id, '').catch(() => null)));
}

/**
 * "Importar do RDO anterior": equipe, equipamentos e locais de trabalho
 * costumam se repetir de um dia para o outro. Quantidades do dia, percentuais
 * e paradas não são copiados — são fatos do dia, não do contexto.
 */
export async function importarDoAnterior(
  autorId: string,
  obraId: string,
  ignorarId: string,
): Promise<Importado | null> {
  const locais = (await listarRdosLocais(autorId))
    .filter((l) => l.rascunho.obra_id === obraId && l.id_local !== ignorarId)
    .sort((a, b) => b.rascunho.data.localeCompare(a.rascunho.data));

  let fonte: Importado | null = locais[0]?.rascunho ?? null;

  if (!fonte) {
    try {
      fonte = await anteriorRemoto(obraId, ignorarId);
    } catch {
      // Sem rede: usa o modelo guardado da última vez que houve conexão.
      const salvo = await AsyncStorage.getItem(chaveAnterior(obraId)).catch(() => null);
      fonte = salvo ? (JSON.parse(salvo) as Importado) : null;
    }
  }

  if (!fonte) return null;

  return {
    mao_obra: fonte.mao_obra.map((l) => ({ ...l, id: novoId() })),
    equipamentos: fonte.equipamentos.map((e) => ({
      ...e,
      id: novoId(),
      horas_paradas: 0,
      motivo_parada: '',
    })),
    atividades: fonte.atividades.map((a) => ({
      ...a,
      id: novoId(),
      descricao: '',
      quantidade_dia: null,
      percentual: null,
    })),
  };
}

function horaLocal(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Fortaleza',
  });
}

/** Traz um RDO do servidor para o aparelho — usado quando o Master devolve. */
export async function baixarRdoParaEdicao(rdoId: string, autorId: string): Promise<RascunhoRdo> {
  const { data: rdo, error } = await supabase
    .from('rdos')
    .select('*, obras(nome)')
    .eq('id', rdoId)
    .single();
  if (error) throw new Error(traduzirErro(error));

  const [cl, mo, eq, at, oc, pd] = await Promise.all([
    supabase.from('rdo_clima').select('*').eq('rdo_id', rdoId),
    supabase.from('rdo_mao_obra').select('*').eq('rdo_id', rdoId).order('created_at'),
    supabase.from('rdo_equipamentos').select('*').eq('rdo_id', rdoId).order('created_at'),
    supabase.from('rdo_atividades').select('*').eq('rdo_id', rdoId).order('created_at'),
    supabase.from('rdo_ocorrencias').select('*').eq('rdo_id', rdoId).order('created_at'),
    supabase.from('rdo_pendencias').select('*').eq('rdo_id', rdoId).order('created_at'),
  ]);

  const rascunho: RascunhoRdo = {
    id: rdo.id,
    obra_id: rdo.obra_id,
    obra_nome: rdo.obras?.nome ?? '',
    numero: rdo.numero,
    data: rdo.data,
    turno: rdo.turno,
    sem_producao: Boolean(rdo.sem_producao_justificativa),
    sem_producao_justificativa: rdo.sem_producao_justificativa ?? '',
    declaracao_aceita: false,
    devolucao_motivo: rdo.devolucao_motivo,
    clima: (cl.data ?? []).map((c) => ({
      id: c.id,
      periodo: c.periodo as 'manha' | 'tarde' | 'noite',
      condicao: c.condicao,
      temperatura_c: c.temperatura_c === null ? null : Number(c.temperatura_c),
      choveu: c.choveu,
      chuva_duracao_min: c.chuva_duracao_min,
      chuva_impacto: c.chuva_impacto ?? '',
      precipitacao_mm: c.precipitacao_mm === null ? null : Number(c.precipitacao_mm),
      horas_paralisadas: c.horas_paralisadas === null ? null : Number(c.horas_paralisadas),
    })),
    mao_obra: (mo.data ?? []).map((l) => ({
      id: l.id,
      equipe: l.equipe ?? '',
      funcao: l.funcao,
      quantidade: l.quantidade,
      horas: Number(l.horas),
    })),
    equipamentos: (eq.data ?? []).map((e) => ({
      id: e.id,
      tipo: e.tipo,
      identificacao: e.identificacao ?? '',
      quantidade: e.quantidade,
      horas_produtivas: Number(e.horas_produtivas),
      horas_paradas: Number(e.horas_paradas),
      motivo_parada: e.motivo_parada ?? '',
      operador: e.operador ?? '',
    })),
    atividades: (at.data ?? []).map((a) => ({
      id: a.id,
      local: a.local ?? '',
      servico: a.servico,
      descricao: a.descricao ?? '',
      unidade: a.unidade ?? '',
      quantidade_dia: a.quantidade_dia === null ? null : Number(a.quantidade_dia),
      percentual: a.percentual === null ? null : Number(a.percentual),
      situacao: a.situacao ?? '',
    })),
    ocorrencias: (oc.data ?? []).map((o) => ({
      id: o.id,
      descricao: o.descricao,
      horario: horaLocal(o.horario),
      impacto: o.impacto ?? '',
      acao_imediata: o.acao_imediata ?? '',
      responsavel: o.responsavel ?? '',
    })),
    pendencias: (pd.data ?? []).map((p) => ({
      id: p.id,
      descricao: p.descricao,
      responsavel: p.responsavel ?? '',
      prazo: p.prazo,
      criticidade: p.criticidade ?? '',
    })),
  };

  await salvarRdoBaixado(rascunho, autorId, rdo.id);
  return rascunho;
}
