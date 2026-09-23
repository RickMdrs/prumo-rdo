import { Feather } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { ALVO_TOQUE, cores, espaco, icone, raio, tipografia } from '@/theme/tokens';
import { Texto } from './Texto';

type Variante = 'primaria' | 'destaque' | 'secundaria' | 'fantasma' | 'perigo';
type Tamanho = 'md' | 'lg';

type Props = {
  titulo: string;
  onPress: () => void;
  variante?: Variante;
  tamanho?: Tamanho;
  iconeEsquerda?: keyof typeof Feather.glyphMap;
  iconeDireita?: keyof typeof Feather.glyphMap;
  carregando?: boolean;
  desabilitado?: boolean;
  larguraTotal?: boolean;
  estilo?: ViewStyle;
  /** Sobrescreve o rótulo lido por leitores de tela quando o título sozinho não basta. */
  rotuloAcessivel?: string;
};

const PALETA: Record<Variante, { fundo: string; texto: string; borda?: string }> = {
  primaria: { fundo: cores.primaria, texto: cores.sobrePrimaria },
  destaque: { fundo: cores.destaque, texto: cores.sobreDestaque },
  secundaria: { fundo: cores.superficie, texto: cores.texto, borda: cores.borda },
  fantasma: { fundo: 'transparent', texto: cores.primaria },
  perigo: { fundo: cores.erro, texto: '#FFFFFF' },
};

export function Botao({
  titulo,
  onPress,
  variante = 'primaria',
  tamanho = 'lg',
  iconeEsquerda,
  iconeDireita,
  carregando = false,
  desabilitado = false,
  larguraTotal = true,
  estilo,
  rotuloAcessivel,
}: Props) {
  const paleta = PALETA[variante];
  const inativo = desabilitado || carregando;
  const altura = tamanho === 'lg' ? 56 : ALVO_TOQUE;

  return (
    <Pressable
      onPress={onPress}
      disabled={inativo}
      accessibilityRole="button"
      accessibilityLabel={rotuloAcessivel ?? titulo}
      accessibilityState={{ disabled: inativo, busy: carregando }}
      style={({ pressed }) => [
        styles.base,
        {
          height: altura,
          backgroundColor: paleta.fundo,
          borderColor: paleta.borda ?? 'transparent',
          borderWidth: paleta.borda ? 1 : 0,
          alignSelf: larguraTotal ? 'stretch' : 'flex-start',
          paddingHorizontal: larguraTotal ? espaco.xl : espaco.lg,
        },
        pressed && !inativo && styles.pressionado,
        inativo && styles.inativo,
        estilo,
      ]}
    >
      {carregando ? (
        <ActivityIndicator color={paleta.texto} />
      ) : (
        <View style={styles.conteudo}>
          {iconeEsquerda ? (
            <Feather name={iconeEsquerda} size={icone.md} color={paleta.texto} />
          ) : null}
          <Texto style={[tipografia.corpoForte, { color: paleta.texto }]} numberOfLines={1}>
            {titulo}
          </Texto>
          {iconeDireita ? (
            <Feather name={iconeDireita} size={icone.md} color={paleta.texto} />
          ) : null}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: raio.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  conteudo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.sm,
  },
  // Só opacidade: mudar escala/tamanho deslocaria o conteúdo ao redor.
  pressionado: { opacity: 0.82 },
  inativo: { opacity: 0.45 },
});
