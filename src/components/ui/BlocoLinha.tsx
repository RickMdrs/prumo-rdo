import { Feather } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { cores, espaco, icone, raio } from '@/theme/tokens';
import { Texto } from './Texto';

type Props = {
  titulo: string;
  children: ReactNode;
  onRemover?: () => void;
  /** Linhas bloqueadas (RDO já enviado) não mostram o botão de remover. */
  bloqueado?: boolean;
};

/** Um item repetível do RDO: uma função da mão de obra, um equipamento, etc. */
export function BlocoLinha({ titulo, children, onRemover, bloqueado }: Props) {
  return (
    <View style={styles.base}>
      <View style={styles.cabecalho}>
        <Texto variante="corpoForte" style={styles.titulo} numberOfLines={1}>
          {titulo}
        </Texto>
        {onRemover && !bloqueado ? (
          <Pressable
            onPress={() =>
              Alert.alert('Remover', `Remover "${titulo}"?`, [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Remover', style: 'destructive', onPress: onRemover },
              ])
            }
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={`Remover ${titulo}`}
            style={styles.remover}
          >
            <Feather name="trash-2" size={icone.sm} color={cores.erro} />
          </Pressable>
        ) : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    gap: espaco.md,
    padding: espaco.lg,
    borderRadius: raio.md,
    borderWidth: 1,
    borderColor: cores.borda,
    backgroundColor: cores.fundo,
  },
  cabecalho: { flexDirection: 'row', alignItems: 'center', gap: espaco.sm },
  titulo: { flex: 1 },
  remover: { padding: espaco.xs },
});
