import { Feather } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { ALTURA_BARRA_ABAS } from '@/components/BarraAbas';
import { CabecalhoTela } from '@/components/CabecalhoTela';
import { Botao, Carregando, EstadoVazio, Tela, Texto } from '@/components/ui';
import { useAuth } from '@/features/auth/useAuth';
import { criarRascunho } from '@/features/rdo/rascunho';
import { obrasDisponiveis, prepararImportacaoOffline } from '@/features/rdo/remoto';
import { IndicadorSync } from '@/features/sync/IndicadorSync';
import { salvarRdoLocal } from '@/lib/db-local';
import { agendarSincronizacao } from '@/lib/sync';
import { cores, espaco, icone, raio } from '@/theme/tokens';

export default function NovoRdo() {
  const router = useRouter();
  const { sessao } = useAuth();
  const autorId = sessao?.user.id ?? '';
  const [criando, setCriando] = useState<string | null>(null);

  const {
    data: obras,
    isPending,
    error,
    refetch,
  } = useQuery({
    queryKey: ['obras-disponiveis', autorId],
    queryFn: async () => {
      const lista = await obrasDisponiveis(autorId);
      // Em segundo plano: deixa o "Importar do RDO anterior" pronto para o modo avião.
      void prepararImportacaoOffline(lista.map((o) => o.id));
      return lista;
    },
    enabled: Boolean(autorId),
  });

  async function comecar(obraId: string, obraNome: string) {
    setCriando(obraId);
    try {
      const rascunho = criarRascunho(obraId, obraNome);
      await salvarRdoLocal(rascunho, autorId);
      agendarSincronizacao();
      router.push(`/rdo/${rascunho.id}`);
    } catch (e) {
      Alert.alert('Não foi possível criar o RDO', e instanceof Error ? e.message : '');
    } finally {
      setCriando(null);
    }
  }

  if (isPending) return <Carregando mensagem="Carregando suas obras" />;

  return (
    <Tela folgaInferior={ALTURA_BARRA_ABAS}>
      <CabecalhoTela titulo="Novo RDO" subtitulo="Escolha a obra de hoje" />

      <IndicadorSync />

      <View style={styles.lista}>
        {error ? (
          <>
            <EstadoVazio
              icone="wifi-off"
              titulo="Não foi possível carregar as obras"
              descricao="Abra o app uma vez com internet para que suas obras fiquem guardadas no aparelho."
            />
            <Botao titulo="Tentar de novo" variante="secundaria" onPress={() => void refetch()} />
          </>
        ) : obras.length === 0 ? (
          <EstadoVazio
            icone="layers"
            titulo="Você não está em nenhuma obra"
            descricao="Peça ao responsável técnico para vincular você a uma obra."
          />
        ) : (
          obras.map((obra) => (
            <Pressable
              key={obra.id}
              onPress={() => void comecar(obra.id, obra.nome)}
              disabled={criando !== null}
              accessibilityRole="button"
              accessibilityLabel={`Começar RDO de hoje na obra ${obra.nome}`}
              style={({ pressed }) => [styles.obra, pressed && styles.pressionado]}
            >
              <View style={styles.chip}>
                <Feather name="clipboard" size={icone.md} color={cores.sobrePrimaria} />
              </View>
              <View style={styles.flex}>
                <Texto variante="corpoForte" cor={cores.sobrePrimaria} numberOfLines={2}>
                  {obra.nome}
                </Texto>
                <Texto variante="auxiliar" cor="rgba(255,255,255,0.75)">
                  {criando === obra.id ? 'Criando…' : 'Toque para começar o RDO de hoje'}
                </Texto>
              </View>
              <Feather name="arrow-right" size={icone.lg} color={cores.sobrePrimaria} />
            </Pressable>
          ))
        )}
      </View>

      <Texto variante="auxiliar" cor={cores.textoDesabilitado} style={styles.nota}>
        Funciona sem internet: o RDO fica salvo no aparelho e é enviado sozinho quando a conexão
        voltar.
      </Texto>
    </Tela>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  lista: { gap: espaco.md, marginTop: espaco.xl },
  obra: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.md,
    padding: espaco.lg,
    borderRadius: raio.lg,
    backgroundColor: cores.primaria,
  },
  chip: {
    width: 44,
    height: 44,
    borderRadius: raio.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  pressionado: { opacity: 0.85 },
  nota: { marginTop: espaco.xl },
});
