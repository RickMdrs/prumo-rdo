import { Text, type TextProps } from 'react-native';

import { cores, tipografia } from '@/theme/tokens';

type Variante = keyof typeof tipografia;

type Props = TextProps & {
  variante?: Variante;
  cor?: string;
  centro?: boolean;
};

export function Texto({
  variante = 'corpo',
  cor = cores.texto,
  centro = false,
  style,
  ...rest
}: Props) {
  return (
    <Text
      style={[tipografia[variante], { color: cor }, centro && { textAlign: 'center' }, style]}
      // Respeita a fonte ampliada do sistema, mas com teto: acima de 1,4× os
      // números grandes e os cartões do painel deixam de caber na tela.
      maxFontSizeMultiplier={variante === 'display' ? 1.2 : 1.4}
      {...rest}
    />
  );
}
