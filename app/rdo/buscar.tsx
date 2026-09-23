import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Botao, CampoData, CampoNumero, Seletor, Texto } from '@/components/ui';
import { buscarRdos, type FiltrosBusca } from '@/features/fluxo/busca';
import { ListaCaixa } from '@/features/fluxo/ListaCaixa';
import { useObras } from '@/features/obras/hooks';
import { cores, espaco, raio } from '@/theme/tokens';

type Situacao = NonNullable<FiltrosBusca['status']> | 'todas';

const SITUACOES: { valor: Situacao; rotulo: string }[] = [
  { valor: 'todas', rotulo: 'Todas' },
  { valor: 'rascunho', rotulo: 'Rascunho' },
  { valor: 'devolvido', rotulo: 'Devolvido' },
  { valor: 'submetido', rotulo: 'Submetido' },
  { valor: 'em_analise', rotulo: 'Em análise' },
  { valor: 'enviado_cliente', rotulo: 'Aguardando cliente' },
  { valor: 'finalizado', rotulo: 'Finalizado' },
  { valor: 'retificado', rotulo: 'Retificado' },
  { valor: 'cancelado', rotulo: 'Cancelado' },
];

const VAZIO: FiltrosBusca = { obraId: null, de: null, ate: null, numero: null, status: null };

export default function BuscarRdos() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: obras } = useObras();

  const [rascunho, setRascunho] = useState<FiltrosBusca>(VAZIO);
  const [aplicados, setAplicados] = useState<FiltrosBusca>(VAZIO);

  const resultado = useQuery({
    queryKey: ['busca', aplicados],
    queryFn: () => buscarRdos(aplicados),
  });

  const opcoesObra = [
    { valor: 'todas', rotulo: 'Todas' },
    ...(obras ?? []).map((o) => ({ valor: o.id, rotulo: o.nome })),
  ];

  const periodoInvalido = Boolean(rascunho.de && rascunho.ate && rascunho.ate < rascunho.de);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.tela}
        contentContainerStyle={[
          styles.conteudo,
          { paddingTop: insets.top + espaco.sm, paddingBottom: insets.bottom + espaco.xxl },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Botao
          titulo="Voltar"
          variante="fantasma"
          iconeEsquerda="arrow-left"
          larguraTotal={false}
          onPress={() => router.back()}
        />
        <Texto variante="display">Buscar RDOs</Texto>

        <View style={styles.filtros}>
          <Seletor
            rotulo="Obra"
            opcoes={opcoesObra}
            valor={rascunho.obraId ?? 'todas'}
            rolagem
            onChange={(v) => setRascunho((f) => ({ ...f, obraId: v === 'todas' ? null : v }))}
          />
          <View style={styles.linha}>
            <CampoData
              rotulo="De"
              valor={rascunho.de}
              onChange={(de) => setRascunho((f) => ({ ...f, de }))}
              estilo={styles.flex}
            />
            <CampoData
              rotulo="Até"
              valor={rascunho.ate}
              onChange={(ate) => setRascunho((f) => ({ ...f, ate }))}
              erro={periodoInvalido ? 'Antes do início' : undefined}
              estilo={styles.flex}
            />
          </View>
          <CampoNumero
            rotulo="Número do RDO"
            valor={rascunho.numero}
            onChange={(numero) => setRascunho((f) => ({ ...f, numero }))}
          />
          <Seletor
            rotulo="Situação"
            opcoes={SITUACOES}
            valor={rascunho.status ?? 'todas'}
            rolagem
            onChange={(v) => setRascunho((f) => ({ ...f, status: v === 'todas' ? null : v }))}
          />
          <View style={styles.linha}>
            <Botao
              titulo="Limpar"
              variante="secundaria"
              larguraTotal={false}
              estilo={styles.flex}
              onPress={() => {
                setRascunho(VAZIO);
                setAplicados(VAZIO);
              }}
            />
            <Botao
              titulo="Buscar"
              iconeEsquerda="search"
              larguraTotal={false}
              estilo={styles.flex}
              desabilitado={periodoInvalido}
              onPress={() => setAplicados(rascunho)}
            />
          </View>
        </View>

        <Texto variante="subtitulo">
          {resultado.data ? `${resultado.data.length} resultado(s)` : 'Resultados'}
        </Texto>
        <ListaCaixa
          itens={resultado.data}
          carregando={resultado.isPending}
          erro={resultado.error}
          onTentarDeNovo={() => void resultado.refetch()}
          vazio={{ titulo: 'Nada encontrado', descricao: 'Ajuste os filtros e busque de novo.' }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  tela: { flex: 1, backgroundColor: cores.fundo },
  conteudo: { paddingHorizontal: espaco.lg, gap: espaco.lg },
  filtros: {
    gap: espaco.lg,
    padding: espaco.lg,
    borderRadius: raio.md,
    backgroundColor: cores.superficie,
  },
  linha: { flexDirection: 'row', gap: espaco.md },
});
