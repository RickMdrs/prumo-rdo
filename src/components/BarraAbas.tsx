import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useDerivedValue,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/features/auth/useAuth';
import { ABAS, ABAS_POR_PAPEL, type Aba } from '@/features/navegacao/abas';
import { useAvisosStore } from '@/features/notificacoes/store';
import { cores, espaco, fontes, icone, raio, sombra } from '@/theme/tokens';

/** Folga que as telas precisam deixar no fim do conteúdo. */
export const ALTURA_BARRA_ABAS = 88;

const ITEM_MAX = 46;
const ESPACAMENTO = 4;
const RECUO = 5;

const MOLA = { damping: 18, stiffness: 190, mass: 0.7 };

/**
 * O expo-router empacota o react-navigation internamente, então o pacote
 * @react-navigation/bottom-tabs não é resolvível aqui. Declarar só o que a
 * barra usa evita a dependência e continua compatível com o que o Tabs passa.
 */
type PropsBarraAbas = {
  state: { index: number; routes: { key: string; name: string }[] };
  navigation: {
    emit: (evento: { type: 'tabPress'; target: string; canPreventDefault: true }) => {
      defaultPrevented: boolean;
    };
    navigate: (rota: string) => void;
  };
};

type PropsItem = {
  aba: Aba;
  posicao: number;
  indice: SharedValue<number>;
  tamanho: number;
  onPress: () => void;
};

function ItemAba({ aba, posicao, indice, tamanho, onPress }: PropsItem) {
  const naoLidas = useAvisosStore((e) => e.naoLidas);
  const contador = aba.rota === 'notificacoes' && naoLidas > 0 ? naoLidas : 0;

  // A troca de cor do ícone acompanha a pílula: as duas versões ficam
  // empilhadas e a opacidade cruza conforme ela se aproxima.
  const faixa = [posicao - 0.6, posicao, posicao + 0.6];

  const estiloSelecionado = useAnimatedStyle(() => ({
    opacity: interpolate(indice.value, faixa, [0, 1, 0], Extrapolation.CLAMP),
  }));

  const estiloNormal = useAnimatedStyle(() => ({
    opacity: interpolate(indice.value, faixa, [1, 0, 1], Extrapolation.CLAMP),
  }));

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityLabel={contador > 0 ? `${aba.rotulo}, ${contador} não lidos` : aba.rotulo}
      style={[styles.item, { width: tamanho, height: tamanho }]}
    >
      <Animated.View style={[styles.camadaIcone, estiloNormal]}>
        <Feather name={aba.icone} size={icone.md} color="rgba(255,255,255,0.72)" />
      </Animated.View>
      <Animated.View style={[styles.camadaIcone, estiloSelecionado]}>
        <Feather name={aba.icone} size={icone.md} color={cores.primaria} />
      </Animated.View>
      {contador > 0 ? (
        <View style={styles.contador} pointerEvents="none">
          <Text style={styles.contadorTexto}>{contador > 9 ? '9+' : contador}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

export function BarraAbas({ state, navigation }: PropsBarraAbas) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const { papel } = useAuth();

  // Com href: null o expo-router só esconde o botão padrão — a rota continua
  // em state.routes. Por isso o filtro por papel acontece aqui.
  const permitidas = papel ? ABAS_POR_PAPEL[papel] : [];
  const abas = state.routes
    .map((rota) => ({ rota, aba: ABAS[rota.name] }))
    .filter(
      (item): item is { rota: (typeof state.routes)[number]; aba: Aba } =>
        Boolean(item.aba) && permitidas.includes(item.rota.name),
    );

  const rotaAtiva = state.routes[state.index]?.key;
  const posicaoAtiva = Math.max(
    0,
    abas.findIndex(({ rota }) => rota.key === rotaAtiva),
  );

  // O item encolhe se a tela for estreita, então a pílula nunca ultrapassa a
  // largura disponível.
  const quantidade = Math.max(1, abas.length);
  const larguraLivre = width - espaco.lg * 2 - RECUO * 2 - ESPACAMENTO * (quantidade - 1);
  const tamanhoItem = Math.max(40, Math.min(ITEM_MAX, Math.floor(larguraLivre / quantidade)));
  const passo = tamanhoItem + ESPACAMENTO;

  const indice = useDerivedValue(() => withSpring(posicaoAtiva, MOLA), [posicaoAtiva]);

  const estiloPilula = useAnimatedStyle(() => ({
    transform: [{ translateX: indice.value * passo }],
  }));

  return (
    <View
      style={[styles.ancora, { paddingBottom: insets.bottom + espaco.sm }]}
      pointerEvents="box-none"
    >
      <View style={styles.pilula}>
        <Animated.View
          style={[styles.selecao, { width: tamanhoItem, height: tamanhoItem }, estiloPilula]}
          pointerEvents="none"
        />

        {abas.map(({ rota, aba }, posicao) => (
          <ItemAba
            key={rota.key}
            aba={aba}
            posicao={posicao}
            indice={indice}
            tamanho={tamanhoItem}
            onPress={() => {
              const evento = navigation.emit({
                type: 'tabPress',
                target: rota.key,
                canPreventDefault: true,
              });
              if (posicaoAtiva !== posicao && !evento.defaultPrevented) {
                navigation.navigate(rota.name);
              }
            }}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  ancora: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    paddingHorizontal: espaco.lg,
  },
  pilula: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACAMENTO,
    padding: RECUO,
    borderRadius: raio.pill,
    backgroundColor: cores.primaria,
    ...sombra.flutuante,
  },
  selecao: {
    position: 'absolute',
    left: RECUO,
    top: RECUO,
    borderRadius: raio.pill,
    backgroundColor: cores.fundo,
  },
  item: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  contador: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: raio.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: cores.destaque,
    borderWidth: 1.5,
    borderColor: cores.primaria,
  },
  contadorTexto: { fontFamily: fontes.bold, fontSize: 10, color: cores.sobreDestaque },
  camadaIcone: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
