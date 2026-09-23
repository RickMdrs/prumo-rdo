import { useQuery } from '@tanstack/react-query';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ALTURA_BARRA_ABAS } from '@/components/BarraAbas';
import { MarcaPrumo } from '@/components/MarcaPrumo';
import { Botao, Seletor, Texto } from '@/components/ui';
import { useAuth } from '@/features/auth/useAuth';
import { FILTROS, listarCaixa, type FiltroCaixa } from '@/features/fluxo/caixa';
import { ListaCaixa } from '@/features/fluxo/ListaCaixa';
import { Painel, usePainel } from '@/features/painel/Painel';
import { cores, espaco } from '@/theme/tokens';

function saudacao(): string {
  const hora = new Date().getHours();
  if (hora < 12) return 'Bom dia';
  if (hora < 18) return 'Boa tarde';
  return 'Boa noite';
}

const VAZIO: Record<FiltroCaixa, { titulo: string; descricao: string }> = {
  pendentes: {
    titulo: 'Nada para analisar',
    descricao: 'Quando a equipe de campo submeter um RDO, ele aparece aqui.',
  },
  devolvidos: { titulo: 'Nenhum devolvido', descricao: 'RDOs devolvidos aguardando correção.' },
  cliente: { titulo: 'Nada com o cliente', descricao: 'RDOs validados esperando ciência.' },
  finalizados: { titulo: 'Nenhum finalizado', descricao: 'RDOs com ciência do cliente.' },
  todos: { titulo: 'Nenhum RDO', descricao: 'Ainda não há RDOs nas suas obras.' },
};

export default function Inicio() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { perfil } = useAuth();
  const primeiroNome = perfil?.nome.split(' ').slice(0, 2).join(' ') ?? '';
  const [filtro, setFiltro] = useState<FiltroCaixa>('pendentes');

  const painel = usePainel();
  const caixa = useQuery({
    queryKey: ['caixa', filtro],
    queryFn: () => listarCaixa(filtro),
  });

  useFocusEffect(
    useCallback(() => {
      void caixa.refetch();
      void painel.refetch();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  return (
    <ScrollView
      style={styles.tela}
      contentContainerStyle={[
        styles.conteudo,
        {
          paddingTop: insets.top + espaco.sm,
          paddingBottom: insets.bottom + ALTURA_BARRA_ABAS + espaco.lg,
        },
      ]}
      refreshControl={
        <RefreshControl
          refreshing={painel.isRefetching}
          onRefresh={() => {
            void painel.refetch();
            void caixa.refetch();
          }}
          tintColor={cores.primaria}
        />
      }
    >
      <View style={styles.cabecalho}>
        <View style={styles.textos}>
          <Texto variante="auxiliar" cor={cores.textoSecundario}>
            {saudacao()}
          </Texto>
          <Texto variante="titulo" numberOfLines={1}>
            {primeiroNome}
          </Texto>
        </View>
        <MarcaPrumo tamanho={48} />
      </View>

      <Painel dados={painel.data} filtroAtivo={filtro} aoFiltrar={setFiltro} />

      <View style={styles.secao}>
        <View style={styles.linha}>
          <Texto variante="subtitulo" style={styles.flex}>
            Caixa de análise
          </Texto>
          <Botao
            titulo="Buscar"
            variante="fantasma"
            iconeEsquerda="search"
            tamanho="md"
            larguraTotal={false}
            onPress={() => router.push('/rdo/buscar')}
          />
        </View>
        <Seletor opcoes={FILTROS} valor={filtro} onChange={setFiltro} rolagem />
        <ListaCaixa
          itens={caixa.data}
          carregando={caixa.isPending}
          erro={caixa.error}
          onTentarDeNovo={() => void caixa.refetch()}
          vazio={VAZIO[filtro]}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo },
  conteudo: { paddingHorizontal: espaco.lg, gap: espaco.xl },
  flex: { flex: 1 },
  cabecalho: { flexDirection: 'row', alignItems: 'center', gap: espaco.md },
  textos: { flex: 1, gap: 2 },
  secao: { gap: espaco.md },
  linha: { flexDirection: 'row', alignItems: 'center', gap: espaco.sm },
});
