import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ALTURA_BARRA_ABAS } from '@/components/BarraAbas';
import { CabecalhoTela } from '@/components/CabecalhoTela';
import { Botao, Carregando, EstadoVazio, Tela, Texto } from '@/components/ui';
import { useObras } from '@/features/obras/hooks';
import { formatarData } from '@/lib/datas';
import { cores, espaco, icone, raio } from '@/theme/tokens';

export default function ListaObras() {
  const router = useRouter();
  const { data: obras, isPending, error, refetch } = useObras();

  if (isPending) return <Carregando mensagem="Carregando obras" />;

  return (
    <Tela folgaInferior={ALTURA_BARRA_ABAS}>
      <CabecalhoTela
        titulo="Obras"
        subtitulo={obras ? `${obras.length} cadastrada(s)` : undefined}
      />

      <Botao
        titulo="Nova obra"
        iconeEsquerda="plus"
        onPress={() => router.push('/obras/nova')}
        estilo={styles.botaoNova}
      />

      {error ? (
        <View style={styles.erro}>
          <Texto variante="corpo" cor={cores.erro}>
            {error.message}
          </Texto>
          <Botao titulo="Tentar de novo" variante="secundaria" onPress={() => void refetch()} />
        </View>
      ) : obras.length === 0 ? (
        <EstadoVazio
          icone="layers"
          titulo="Nenhuma obra cadastrada"
          descricao="Crie a primeira obra para começar a registrar RDOs."
        />
      ) : (
        <View style={styles.lista}>
          {obras.map((obra) => (
            <Pressable
              key={obra.id}
              onPress={() => router.push(`/obras/${obra.id}`)}
              accessibilityRole="button"
              accessibilityLabel={`Abrir a obra ${obra.nome}`}
              style={({ pressed }) => [
                styles.cartao,
                !obra.ativa && styles.cartaoInativo,
                pressed && styles.pressionado,
              ]}
            >
              <View style={styles.chip}>
                <Feather name="layers" size={icone.md} color={cores.primaria} />
              </View>

              <View style={styles.textos}>
                <Texto variante="corpoForte" numberOfLines={2}>
                  {obra.nome}
                </Texto>
                <Texto variante="auxiliar" cor={cores.textoSecundario} numberOfLines={1}>
                  {obra.contrato ? `Contrato ${obra.contrato} · ` : ''}
                  {obra.cliente_nome ?? 'Sem cliente informado'}
                </Texto>
                <Texto variante="auxiliar" cor={cores.textoDesabilitado}>
                  Início {formatarData(obra.inicio)}
                </Texto>

                {!obra.ativa ? (
                  <View style={styles.etiquetaInativa}>
                    <Texto variante="rotulo" cor={cores.textoSecundario}>
                      INATIVA
                    </Texto>
                  </View>
                ) : null}
              </View>

              <Feather name="chevron-right" size={icone.lg} color={cores.textoSecundario} />
            </Pressable>
          ))}
        </View>
      )}
    </Tela>
  );
}

const styles = StyleSheet.create({
  botaoNova: { marginBottom: espaco.xl },
  lista: { gap: espaco.md },
  cartao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.md,
    padding: espaco.lg,
    borderRadius: raio.md,
    backgroundColor: cores.superficie,
  },
  cartaoInativo: { opacity: 0.6 },
  chip: {
    width: 44,
    height: 44,
    borderRadius: raio.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: cores.fundo,
  },
  textos: { flex: 1, gap: 2 },
  etiquetaInativa: {
    alignSelf: 'flex-start',
    marginTop: espaco.xs,
    paddingVertical: 3,
    paddingHorizontal: espaco.sm,
    borderRadius: raio.pill,
    backgroundColor: cores.superficieForte,
  },
  erro: { gap: espaco.md },
  pressionado: { opacity: 0.85 },
});
