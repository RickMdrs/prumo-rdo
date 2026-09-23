import { StyleSheet, Switch, View } from 'react-native';

import { cores, espaco } from '@/theme/tokens';
import { Texto } from './Texto';

type Props = {
  rotulo: string;
  descricao?: string;
  valor: boolean;
  onChange: (valor: boolean) => void;
  desabilitado?: boolean;
};

export function Interruptor({ rotulo, descricao, valor, onChange, desabilitado }: Props) {
  return (
    <View style={styles.base}>
      <View style={styles.textos}>
        <Texto variante="corpoForte">{rotulo}</Texto>
        {descricao ? (
          <Texto variante="auxiliar" cor={cores.textoSecundario}>
            {descricao}
          </Texto>
        ) : null}
      </View>
      <Switch
        value={valor}
        onValueChange={onChange}
        disabled={desabilitado}
        trackColor={{ true: cores.primaria, false: cores.bordaForte }}
        accessibilityLabel={rotulo}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  base: { flexDirection: 'row', alignItems: 'center', gap: espaco.md, minHeight: 48 },
  textos: { flex: 1, gap: 2 },
});
