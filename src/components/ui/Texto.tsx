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
      {...rest}
    />
  );
}
