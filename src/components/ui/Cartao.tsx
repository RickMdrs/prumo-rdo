import { Feather } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { cores, espaco, icone, raio, sombra } from '@/theme/tokens';
import { Texto } from './Texto';

type Variante = 'claro' | 'solido' | 'contorno';

type Props = {
  children?: ReactNode;
  variante?: Variante;
  titulo?: string;
  descricao?: string;
  /** Ícone em chip circular, no padrão da referência visual. */
  iconeChip?: keyof typeof Feather.glyphMap;
  onPress?: () => void;
  mostrarSeta?: boolean;
  estilo?: ViewStyle;
  rotuloAcessivel?: string;
};

export function Cartao({
  children,
  variante = 'claro',
  titulo,
  descricao,
  iconeChip,
  onPress,
  mostrarSeta = false,
  estilo,
  rotuloAcessivel,
}: Props) {
  const solido = variante === 'solido';
  const corTitulo = solido ? cores.sobrePrimaria : cores.texto;
  const corDescricao = solido ? 'rgba(255,255,255,0.72)' : cores.textoSecundario;

  const corpo = (
    <>
      {(iconeChip || titulo || mostrarSeta) && (
        <View style={styles.cabecalho}>
          {iconeChip ? (
            <View
              style={[
                styles.chip,
                { backgroundColor: solido ? 'rgba(255,255,255,0.14)' : cores.fundo },
              ]}
            >
              <Feather
                name={iconeChip}
                size={icone.md}
                color={solido ? cores.sobrePrimaria : cores.primaria}
              />
            </View>
          ) : null}

          <View style={styles.textos}>
            {titulo ? (
              <Texto variante="corpoForte" cor={corTitulo} numberOfLines={2}>
                {titulo}
              </Texto>
            ) : null}
            {descricao ? (
              <Texto variante="auxiliar" cor={corDescricao} numberOfLines={2}>
                {descricao}
              </Texto>
            ) : null}
          </View>

          {mostrarSeta ? (
            <Feather
              name="chevron-right"
              size={icone.lg}
              color={solido ? cores.sobrePrimaria : cores.textoSecundario}
            />
          ) : null}
        </View>
      )}
      {children}
    </>
  );

  const estiloBase: ViewStyle[] = [
    styles.base,
    solido
      ? { backgroundColor: cores.primaria, borderRadius: raio.lg }
      : variante === 'contorno'
        ? { backgroundColor: cores.fundo, borderWidth: 1, borderColor: cores.borda }
        : { backgroundColor: cores.superficie },
  ];

  if (!onPress) {
    return <View style={[...estiloBase, solido && sombra.cartao, estilo]}>{corpo}</View>;
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={rotuloAcessivel ?? titulo}
      style={({ pressed }) => [
        ...estiloBase,
        solido && sombra.cartao,
        pressed && styles.pressionado,
        estilo,
      ]}
    >
      {corpo}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: raio.md,
    padding: espaco.lg,
    gap: espaco.md,
  },
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.md,
  },
  chip: {
    width: 44,
    height: 44,
    borderRadius: raio.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textos: { flex: 1, gap: 2 },
  pressionado: { opacity: 0.85 },
});
