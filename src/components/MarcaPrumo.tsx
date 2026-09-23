import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { cores } from '@/theme/tokens';

type Props = {
  tamanho?: number;
  cor?: string;
  corFundo?: string;
};

/**
 * Fio de prumo: linha vertical com o peso na ponta. Símbolo da marca.
 * Desenhado numa viewBox 48x48 para escalar sem perder o alinhamento do fio.
 */
export function MarcaPrumo({
  tamanho = 48,
  cor = cores.sobrePrimaria,
  corFundo = cores.primaria,
}: Props) {
  return (
    <Svg width={tamanho} height={tamanho} viewBox="0 0 48 48">
      <Rect x={0} y={0} width={48} height={48} rx={14} fill={corFundo} />
      <Circle cx={24} cy={11} r={2.4} fill={cor} />
      <Path d="M24 13.4V26" stroke={cor} strokeWidth={2} strokeLinecap="round" />
      <Path
        d="M24 26 L31 30.5 L24 41 L17 30.5 Z"
        fill={cor}
        stroke={cor}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
    </Svg>
  );
}
