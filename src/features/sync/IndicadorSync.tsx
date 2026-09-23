import { Feather } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Texto } from '@/components/ui';
import { sincronizar } from '@/lib/sync';
import { cores, espaco, raio } from '@/theme/tokens';
import { useStatusConexao } from './hooks';
import { useFilaStore } from './store';

function textoPendentes(n: number): string {
  if (n === 0) return 'Tudo enviado';
  if (n === 1) return '1 item aguardando envio';
  return `${n} itens aguardando envio`;
}

export function IndicadorSync() {
  const { online } = useStatusConexao();
  const pendentes = useFilaStore((e) => e.pendentes);
  const sincronizando = useFilaStore((e) => e.sincronizando);
  const ultimoErro = useFilaStore((e) => e.ultimoErro);

  const corFundo = !online ? '#FDF3E3' : ultimoErro && pendentes > 0 ? '#FBE9E7' : '#E3F2EA';
  const corTexto = !online ? cores.aviso : ultimoErro && pendentes > 0 ? cores.erro : cores.sucesso;

  const titulo = !online ? 'Sem conexão' : sincronizando ? 'Enviando…' : 'Online';

  return (
    <Pressable
      onPress={() => void sincronizar()}
      disabled={!online || sincronizando}
      accessibilityRole="button"
      accessibilityLabel={`${titulo}. ${textoPendentes(pendentes)}. Toque para enviar agora.`}
      style={[styles.base, { backgroundColor: corFundo }]}
    >
      <View style={styles.icone}>
        {sincronizando ? (
          <ActivityIndicator size="small" color={corTexto} />
        ) : (
          <Feather name={online ? 'cloud' : 'cloud-off'} size={18} color={corTexto} />
        )}
      </View>
      <View style={styles.textos}>
        <Texto variante="corpoForte" cor={corTexto}>
          {titulo}
        </Texto>
        <Texto variante="auxiliar" cor={corTexto} numberOfLines={2}>
          {!online && pendentes > 0
            ? `${textoPendentes(pendentes)} — sobe sozinho quando a rede voltar`
            : ultimoErro && pendentes > 0
              ? ultimoErro
              : textoPendentes(pendentes)}
        </Texto>
      </View>
      {online && pendentes > 0 && !sincronizando ? (
        <Feather name="upload-cloud" size={18} color={corTexto} />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.md,
    minHeight: 48,
    paddingVertical: espaco.sm,
    paddingHorizontal: espaco.lg,
    borderRadius: raio.md,
  },
  icone: { width: 22, alignItems: 'center' },
  textos: { flex: 1, gap: 1 },
});
