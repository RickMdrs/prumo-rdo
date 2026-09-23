import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Botao, EstadoVazio, StatusBadge, Texto } from '@/components/ui';
import { formatarData } from '@/lib/datas';
import { statusVisual } from '@/theme/status';
import { cores, espaco, icone, raio } from '@/theme/tokens';
import type { ItemCaixa } from './caixa';

type Props = {
  itens: ItemCaixa[] | undefined;
  carregando: boolean;
  erro: Error | null;
  onTentarDeNovo: () => void;
  vazio: { titulo: string; descricao: string };
};

export function ListaCaixa({ itens, carregando, erro, onTentarDeNovo, vazio }: Props) {
  const router = useRouter();

  if (carregando) {
    return <ActivityIndicator color={cores.primaria} style={styles.carregando} />;
  }

  if (erro) {
    return (
      <View style={styles.lista}>
        <EstadoVazio icone="wifi-off" titulo="Não foi possível carregar" descricao={erro.message} />
        <Botao titulo="Tentar de novo" variante="secundaria" onPress={onTentarDeNovo} />
      </View>
    );
  }

  if (!itens || itens.length === 0) {
    return <EstadoVazio icone="inbox" titulo={vazio.titulo} descricao={vazio.descricao} />;
  }

  return (
    <View style={styles.lista}>
      {itens.map((r) => (
        <Pressable
          key={r.id}
          onPress={() => router.push(`/rdo/ver/${r.id}`)}
          accessibilityRole="button"
          accessibilityLabel={`Abrir RDO número ${r.numero} da obra ${r.obras?.nome ?? ''}`}
          style={({ pressed }) => [styles.cartao, pressed && styles.pressionado]}
        >
          <View style={styles.linha}>
            <Texto variante="corpoForte" style={styles.flex}>
              RDO n. {r.numero}
              {r.versao > 1 ? ` · v${r.versao}` : ''}
            </Texto>
            <StatusBadge status={statusVisual(r.status, r.devolucao_motivo)} />
          </View>
          <Texto variante="auxiliar" cor={cores.textoSecundario} numberOfLines={1}>
            {r.obras?.nome}
          </Texto>
          <View style={styles.linha}>
            <Texto variante="auxiliar" cor={cores.textoSecundario} style={styles.flex}>
              {formatarData(r.data)} · {r.perfis?.nome ?? ''}
            </Texto>
            <Feather name="chevron-right" size={icone.md} color={cores.textoSecundario} />
          </View>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  lista: { gap: espaco.md },
  carregando: { marginTop: espaco.xxl },
  cartao: { gap: 4, padding: espaco.lg, borderRadius: raio.md, backgroundColor: cores.superficie },
  pressionado: { opacity: 0.85 },
  linha: { flexDirection: 'row', alignItems: 'center', gap: espaco.sm },
  flex: { flex: 1 },
});
