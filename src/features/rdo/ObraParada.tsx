import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Botao, Texto } from '@/components/ui';
import { ModalAcao, type ConfigAcao } from '@/features/fluxo/ModalAcao';
import { cores, espaco, icone, raio } from '@/theme/tokens';
import type { PropsEtapa } from './etapas/comum';

type Props = PropsEtapa & {
  /** Leva direto à revisão: num dia parado não há clima nem serviço a lançar. */
  irParaRevisao: () => void;
  /** No início do formulário mostra o botão; na revisão, só o aviso. */
  mostrarBotao: boolean;
};

export function ObraParada({ r, atualizar, irParaRevisao, mostrarBotao }: Props) {
  const [acao, setAcao] = useState<ConfigAcao | null>(null);

  if (r.sem_producao) {
    return (
      <View style={styles.aviso} accessibilityLiveRegion="polite">
        <View style={styles.linha}>
          <Feather name="pause-circle" size={icone.md} color={cores.aviso} />
          <Texto variante="corpoForte" cor={cores.aviso} style={styles.flex}>
            Obra parada hoje
          </Texto>
        </View>
        <Texto variante="auxiliar" cor={cores.aviso}>
          {r.sem_producao_justificativa.trim()
            ? `Motivo: ${r.sem_producao_justificativa.trim()}`
            : 'Informe o motivo na etapa Atividades.'}
        </Texto>
        <Botao
          titulo="Desfazer: houve trabalho"
          variante="fantasma"
          tamanho="md"
          larguraTotal={false}
          iconeEsquerda="rotate-ccw"
          onPress={() => atualizar((a) => ({ ...a, sem_producao: false }))}
        />
      </View>
    );
  }

  if (!mostrarBotao) return null;

  return (
    <>
      <Pressable
        onPress={() =>
          setAcao({
            titulo: 'Obra parada hoje',
            descricao:
              'Use só se ninguém trabalhou na obra hoje. Se apenas algumas pessoas faltaram, preencha o RDO normalmente — a falta entra como ocorrência.',
            campoTexto: {
              rotulo: 'Motivo',
              placeholder: 'Ex.: chuva forte durante todo o dia, sem condição de trabalho',
              minimo: 10,
            },
            rotuloConfirmar: 'Ir para o envio',
            executar: async (motivo) => {
              atualizar((a) => ({
                ...a,
                sem_producao: true,
                sem_producao_justificativa: motivo,
              }));
              irParaRevisao();
            },
          })
        }
        accessibilityRole="button"
        accessibilityLabel="Obra parada hoje. Registrar só o motivo e ir para o envio."
        style={({ pressed }) => [styles.botao, pressed && styles.pressionado]}
      >
        <View style={styles.chip}>
          <Feather name="pause-circle" size={icone.md} color={cores.aviso} />
        </View>
        <View style={styles.flex}>
          <Texto variante="corpoForte">Obra parada hoje</Texto>
          <Texto variante="auxiliar" cor={cores.textoSecundario}>
            Ninguém trabalhou na obra (chuva, feriado, embargo, falta de material). Se só algumas
            pessoas faltaram, preencha o RDO normal.
          </Texto>
        </View>
        <Feather name="chevron-right" size={icone.md} color={cores.textoSecundario} />
      </Pressable>

      <ModalAcao config={acao} onFechar={() => setAcao(null)} />
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  linha: { flexDirection: 'row', alignItems: 'center', gap: espaco.sm },
  botao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.md,
    padding: espaco.lg,
    marginBottom: espaco.lg,
    borderRadius: raio.md,
    borderWidth: 1.5,
    borderColor: '#F3D5A6',
    backgroundColor: '#FFFBF3',
  },
  chip: {
    width: 44,
    height: 44,
    borderRadius: raio.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FDF3E3',
  },
  pressionado: { opacity: 0.85 },
  aviso: {
    gap: espaco.xs,
    padding: espaco.lg,
    marginBottom: espaco.lg,
    borderRadius: raio.md,
    backgroundColor: '#FDF3E3',
  },
});
