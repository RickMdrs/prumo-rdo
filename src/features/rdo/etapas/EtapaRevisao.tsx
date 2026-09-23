import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { Texto } from '@/components/ui';
import { DECLARACAO_OPERACIONAL } from '@/features/fluxo/declaracoes';
import { formatarData } from '@/lib/datas';
import { cores, espaco, icone, raio } from '@/theme/tokens';
import { totalHomemHora, totalTrabalhadores } from '../rascunho';
import { ETAPAS, faltasParaSubmeter } from '../validacao';
import type { PropsEtapa } from './comum';

const TURNO = { manha: 'Manhã', tarde: 'Tarde', noite: 'Noite', integral: 'Integral' } as const;
const PERIODO = { manha: 'Manhã', tarde: 'Tarde', noite: 'Noite' } as const;
const CONDICAO = {
  sol: 'Sol',
  nublado: 'Nublado',
  chuva_fraca: 'Chuva fraca',
  chuva_forte: 'Chuva forte',
  impraticavel: 'Impraticável',
} as const;

type Props = PropsEtapa & {
  irPara: (etapa: number) => void;
  fotos: number;
};

function Resumo({
  titulo,
  etapa,
  irPara,
  children,
}: {
  titulo: string;
  etapa: number;
  irPara: (etapa: number) => void;
  children: React.ReactNode;
}) {
  return (
    <Pressable
      onPress={() => irPara(etapa)}
      accessibilityRole="button"
      accessibilityLabel={`${titulo}. Toque para editar.`}
      style={styles.resumo}
    >
      <View style={styles.resumoCabecalho}>
        <Texto variante="corpoForte" style={styles.flex}>
          {titulo}
        </Texto>
        <Feather name="edit-2" size={icone.sm} color={cores.textoSecundario} />
      </View>
      {children}
    </Pressable>
  );
}

export function EtapaRevisao({ r, atualizar, irPara, fotos }: Props) {
  const faltas = faltasParaSubmeter(r).filter((f) => f.etapa !== 7);

  return (
    <View style={styles.base}>
      {faltas.length > 0 ? (
        <View style={styles.faltas} accessibilityLiveRegion="polite">
          <Texto variante="corpoForte" cor={cores.erro}>
            Falta para submeter ({faltas.length})
          </Texto>
          {faltas.map((f, i) => (
            <Pressable
              key={`${f.etapa}-${i}`}
              onPress={() => irPara(f.etapa)}
              accessibilityRole="button"
              accessibilityLabel={`${f.mensagem} Ir para ${ETAPAS[f.etapa]}.`}
              style={styles.falta}
            >
              <Feather name="alert-circle" size={icone.sm} color={cores.erro} />
              <Texto variante="auxiliar" cor={cores.erro} style={styles.flex}>
                {f.mensagem}
              </Texto>
              <Feather name="chevron-right" size={icone.sm} color={cores.erro} />
            </Pressable>
          ))}
        </View>
      ) : (
        <View style={styles.ok}>
          <Feather name="check-circle" size={icone.md} color={cores.sucesso} />
          <Texto variante="corpoForte" cor={cores.sucesso} style={styles.flex}>
            Tudo preenchido. Confira o resumo e aceite a declaração.
          </Texto>
        </View>
      )}

      <Resumo titulo="Identificação" etapa={0} irPara={irPara}>
        <Texto variante="auxiliar" cor={cores.textoSecundario}>
          {r.obra_nome} · {formatarData(r.data)} · {TURNO[r.turno]}
        </Texto>
      </Resumo>

      <Resumo titulo="Clima" etapa={1} irPara={irPara}>
        <Texto variante="auxiliar" cor={cores.textoSecundario}>
          {r.clima.length === 0
            ? 'Nenhum período registrado'
            : r.clima
                .map(
                  (c) =>
                    `${PERIODO[c.periodo]}: ${CONDICAO[c.condicao]}${c.choveu ? ` (choveu ${c.chuva_duracao_min ?? '?'} min)` : ''}`,
                )
                .join('\n')}
        </Texto>
      </Resumo>

      <Resumo titulo="Mão de obra" etapa={2} irPara={irPara}>
        <Texto variante="auxiliar" cor={cores.textoSecundario}>
          {totalTrabalhadores(r)} trabalhador(es) em {r.mao_obra.length} função(ões) ·{' '}
          {totalHomemHora(r).toLocaleString('pt-BR')} homem-hora
        </Texto>
      </Resumo>

      <Resumo titulo="Equipamentos" etapa={3} irPara={irPara}>
        <Texto variante="auxiliar" cor={cores.textoSecundario}>
          {r.equipamentos.length === 0
            ? 'Nenhum equipamento'
            : `${r.equipamentos.length} equipamento(s); ${r.equipamentos.filter((e) => e.horas_paradas > 0).length} com parada`}
        </Texto>
      </Resumo>

      <Resumo titulo="Atividades" etapa={4} irPara={irPara}>
        <Texto variante="auxiliar" cor={cores.textoSecundario}>
          {r.sem_producao
            ? `Dia sem produção: ${r.sem_producao_justificativa}`
            : r.atividades.length === 0
              ? 'Nenhuma atividade'
              : r.atividades
                  .map((a) => `• ${a.servico}${a.local ? ` — ${a.local}` : ''}`)
                  .join('\n')}
        </Texto>
      </Resumo>

      <Resumo titulo="Ocorrências e pendências" etapa={5} irPara={irPara}>
        <Texto variante="auxiliar" cor={cores.textoSecundario}>
          {r.ocorrencias.length} ocorrência(s) · {r.pendencias.length} pendência(s)
        </Texto>
      </Resumo>

      <Resumo titulo="Fotos" etapa={6} irPara={irPara}>
        <Texto variante="auxiliar" cor={cores.textoSecundario}>
          {fotos} foto(s) com legenda
        </Texto>
      </Resumo>

      <Pressable
        onPress={() => atualizar((a) => ({ ...a, declaracao_aceita: !a.declaracao_aceita }))}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: r.declaracao_aceita }}
        accessibilityLabel="Aceito a declaração de responsabilidade"
        style={[styles.declaracao, r.declaracao_aceita && styles.declaracaoAceita]}
      >
        <View style={[styles.caixa, r.declaracao_aceita && styles.caixaMarcada]}>
          {r.declaracao_aceita ? (
            <Feather name="check" size={icone.sm} color={cores.sobrePrimaria} />
          ) : null}
        </View>
        <View style={styles.flex}>
          <Texto variante="corpoForte">Declaração de responsabilidade</Texto>
          <Texto variante="auxiliar" cor={cores.textoSecundario}>
            {DECLARACAO_OPERACIONAL}
          </Texto>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  base: { gap: espaco.md },
  flex: { flex: 1 },
  faltas: {
    gap: espaco.sm,
    padding: espaco.lg,
    borderRadius: raio.md,
    backgroundColor: '#FBE9E7',
  },
  falta: { flexDirection: 'row', alignItems: 'center', gap: espaco.sm, minHeight: 36 },
  ok: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.sm,
    padding: espaco.lg,
    borderRadius: raio.md,
    backgroundColor: '#E3F2EA',
  },
  resumo: {
    gap: espaco.xs,
    padding: espaco.lg,
    borderRadius: raio.md,
    backgroundColor: cores.superficie,
  },
  resumoCabecalho: { flexDirection: 'row', alignItems: 'center', gap: espaco.sm },
  declaracao: {
    flexDirection: 'row',
    gap: espaco.md,
    marginTop: espaco.md,
    padding: espaco.lg,
    borderRadius: raio.md,
    borderWidth: 1.5,
    borderColor: cores.bordaForte,
  },
  declaracaoAceita: { borderColor: cores.primaria, backgroundColor: '#F2F6FB' },
  caixa: {
    width: 26,
    height: 26,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: cores.bordaForte,
    alignItems: 'center',
    justifyContent: 'center',
  },
  caixaMarcada: { backgroundColor: cores.primaria, borderColor: cores.primaria },
});
