import { StyleSheet, View, type ViewStyle } from 'react-native';

import { APARENCIA_STATUS, type StatusVisual } from '@/theme/status';
import { espaco, raio } from '@/theme/tokens';
import { Texto } from './Texto';

type Props = {
  status: StatusVisual;
  estilo?: ViewStyle;
};

/**
 * Status nunca aparece só por cor — o rótulo em texto vai junto, porque a cor
 * sozinha não é acessível e o app é usado sob sol forte.
 */
export function StatusBadge({ status, estilo }: Props) {
  const { rotulo, cor, fundo } = APARENCIA_STATUS[status];

  return (
    <View
      style={[styles.base, { backgroundColor: fundo }, estilo]}
      accessibilityRole="text"
      accessibilityLabel={`Situação: ${rotulo}`}
    >
      <View style={[styles.ponto, { backgroundColor: cor }]} />
      <Texto variante="rotulo" cor={cor}>
        {rotulo.toUpperCase()}
      </Texto>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: espaco.xs + 2,
    paddingVertical: 6,
    paddingHorizontal: espaco.md,
    borderRadius: raio.pill,
  },
  ponto: { width: 6, height: 6, borderRadius: raio.pill },
});
