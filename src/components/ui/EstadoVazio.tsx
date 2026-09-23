import { Feather } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { cores, espaco, raio } from '@/theme/tokens';
import { Texto } from './Texto';

type Props = {
  icone: keyof typeof Feather.glyphMap;
  titulo: string;
  descricao?: string;
};

export function EstadoVazio({ icone: nomeIcone, titulo, descricao }: Props) {
  return (
    <View style={styles.base}>
      <View style={styles.chip}>
        <Feather name={nomeIcone} size={28} color={cores.textoSecundario} />
      </View>
      <Texto variante="subtitulo" centro>
        {titulo}
      </Texto>
      {descricao ? (
        <Texto variante="corpo" cor={cores.textoSecundario} centro>
          {descricao}
        </Texto>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    gap: espaco.md,
    paddingVertical: espaco.xxl,
    paddingHorizontal: espaco.lg,
  },
  chip: {
    width: 72,
    height: 72,
    borderRadius: raio.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: cores.superficie,
  },
});
