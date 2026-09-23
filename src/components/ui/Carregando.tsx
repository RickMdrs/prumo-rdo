import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { cores, espaco } from '@/theme/tokens';
import { Texto } from './Texto';

type Props = { mensagem?: string };

export function Carregando({ mensagem }: Props) {
  return (
    <View style={styles.base} accessibilityRole="progressbar" accessibilityLabel="Carregando">
      <ActivityIndicator size="large" color={cores.primaria} />
      {mensagem ? (
        <Texto variante="auxiliar" cor={cores.textoSecundario} centro>
          {mensagem}
        </Texto>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: espaco.md,
    backgroundColor: cores.fundo,
  },
});
