import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { cores, espaco } from '@/theme/tokens';
import { Texto } from './ui/Texto';

type Props = {
  titulo: string;
  subtitulo?: string;
  acao?: ReactNode;
};

export function CabecalhoTela({ titulo, subtitulo, acao }: Props) {
  return (
    <View style={styles.base}>
      <View style={styles.textos}>
        <Texto variante="titulo">{titulo}</Texto>
        {subtitulo ? (
          <Texto variante="auxiliar" cor={cores.textoSecundario}>
            {subtitulo}
          </Texto>
        ) : null}
      </View>
      {acao}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.md,
    marginBottom: espaco.xl,
  },
  textos: { flex: 1, gap: 2 },
});
