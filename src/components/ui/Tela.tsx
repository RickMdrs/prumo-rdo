import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { cores, espaco } from '@/theme/tokens';

type Props = {
  children: ReactNode;
  /** Sem scroll quando a tela já usa uma lista virtualizada por dentro. */
  scroll?: boolean;
  /** Espaço extra no fim para o conteúdo não ficar sob a barra flutuante. */
  folgaInferior?: number;
  fundo?: string;
  semPaddingHorizontal?: boolean;
  estilo?: ViewStyle;
};

export function Tela({
  children,
  scroll = true,
  folgaInferior = 0,
  fundo = cores.fundo,
  semPaddingHorizontal = false,
  estilo,
}: Props) {
  const insets = useSafeAreaInsets();

  const conteudo: ViewStyle = {
    paddingTop: insets.top + espaco.sm,
    paddingBottom: insets.bottom + espaco.lg + folgaInferior,
    paddingHorizontal: semPaddingHorizontal ? 0 : espaco.lg,
  };

  if (!scroll) {
    return (
      <View style={[styles.base, { backgroundColor: fundo }, conteudo, estilo]}>{children}</View>
    );
  }

  return (
    <View style={[styles.base, { backgroundColor: fundo }]}>
      <ScrollView
        contentContainerStyle={[conteudo, estilo]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  base: { flex: 1 },
});
