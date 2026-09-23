import { Pressable, ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';

import { ALVO_TOQUE, cores, espaco, raio } from '@/theme/tokens';
import { Texto } from './Texto';

export type OpcaoSeletor<T extends string> = {
  valor: T;
  rotulo: string;
};

type Props<T extends string> = {
  rotulo?: string;
  opcoes: readonly OpcaoSeletor<T>[];
  valor: T | null;
  onChange: (valor: T) => void;
  ajuda?: string;
  erro?: string;
  /** Rola na horizontal quando as opções não cabem numa linha. */
  rolagem?: boolean;
  estilo?: ViewStyle;
};

export function Seletor<T extends string>({
  rotulo,
  opcoes,
  valor,
  onChange,
  ajuda,
  erro,
  rolagem = false,
  estilo,
}: Props<T>) {
  const itens = opcoes.map((opcao) => {
    const ativo = opcao.valor === valor;
    return (
      <Pressable
        key={opcao.valor}
        onPress={() => onChange(opcao.valor)}
        accessibilityRole="radio"
        accessibilityState={{ selected: ativo }}
        accessibilityLabel={opcao.rotulo}
        style={({ pressed }) => [
          styles.opcao,
          ativo ? styles.opcaoAtiva : styles.opcaoInativa,
          pressed && styles.pressionado,
        ]}
      >
        <Texto
          variante={ativo ? 'corpoForte' : 'corpo'}
          cor={ativo ? cores.sobrePrimaria : cores.textoSecundario}
          numberOfLines={1}
        >
          {opcao.rotulo}
        </Texto>
      </Pressable>
    );
  });

  return (
    <View style={[styles.wrapper, estilo]}>
      {rotulo ? (
        <Texto variante="auxiliar" cor={cores.textoSecundario}>
          {rotulo}
        </Texto>
      ) : null}

      {rolagem ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.linha}
        >
          {itens}
        </ScrollView>
      ) : (
        <View style={[styles.linha, styles.linhaQuebra]}>{itens}</View>
      )}

      {erro ? (
        <Texto variante="auxiliar" cor={cores.erro}>
          {erro}
        </Texto>
      ) : ajuda ? (
        <Texto variante="auxiliar" cor={cores.textoDesabilitado}>
          {ajuda}
        </Texto>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: espaco.sm },
  linha: { flexDirection: 'row', gap: espaco.sm },
  linhaQuebra: { flexWrap: 'wrap' },
  opcao: {
    minHeight: ALVO_TOQUE,
    justifyContent: 'center',
    paddingHorizontal: espaco.lg,
    borderRadius: raio.pill,
    borderWidth: 1,
  },
  opcaoAtiva: { backgroundColor: cores.primaria, borderColor: cores.primaria },
  opcaoInativa: { backgroundColor: cores.superficie, borderColor: cores.borda },
  pressionado: { opacity: 0.8 },
});
