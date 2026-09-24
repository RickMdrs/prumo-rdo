import { Feather } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Botao, Carregando, EstadoVazio, Texto } from '@/components/ui';
import { listarFotosRemotas } from '@/features/fotos/api';
import { submeterRdo } from '@/features/fluxo/submeter';
import { EtapaAtividades } from '@/features/rdo/etapas/EtapaAtividades';
import { EtapaClima } from '@/features/rdo/etapas/EtapaClima';
import { EtapaEquipamentos } from '@/features/rdo/etapas/EtapaEquipamentos';
import { EtapaFotos } from '@/features/rdo/etapas/EtapaFotos';
import { EtapaIdentificacao } from '@/features/rdo/etapas/EtapaIdentificacao';
import { EtapaMaoObra } from '@/features/rdo/etapas/EtapaMaoObra';
import { EtapaOcorrencias } from '@/features/rdo/etapas/EtapaOcorrencias';
import { EtapaRevisao } from '@/features/rdo/etapas/EtapaRevisao';
import { useRascunho } from '@/features/rdo/useRascunho';
import { ETAPAS, faltasParaSubmeter, problemasDaEtapa } from '@/features/rdo/validacao';
import { IndicadorSync } from '@/features/sync/IndicadorSync';
import { useFilaStore } from '@/features/sync/store';
import { listarFotosDoRdo } from '@/lib/db-local';
import { cores, espaco, icone, raio, sombra } from '@/theme/tokens';

export default function AssistenteRdo() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const rolagem = useRef<ScrollView>(null);

  const { rascunho: r, carregando, atualizar, gravarAgora } = useRascunho(id);
  const versao = useFilaStore((e) => e.versao);

  const [etapa, setEtapa] = useState(0);
  const [problemas, setProblemas] = useState<string[]>([]);
  const [submetendo, setSubmetendo] = useState(false);

  const { data: fotosLocais } = useQuery({
    queryKey: ['fotos-locais', id, versao],
    queryFn: () => listarFotosDoRdo(id),
  });
  const { data: fotosRemotas } = useQuery({
    queryKey: ['fotos-remotas', id, versao],
    queryFn: () => listarFotosRemotas(id),
    enabled: Boolean(r?.numero),
  });

  if (carregando) return <Carregando mensagem="Abrindo o RDO" />;

  if (!r) {
    return (
      <View style={[styles.vazio, { paddingTop: insets.top }]}>
        <EstadoVazio
          icone="file-minus"
          titulo="RDO não encontrado neste aparelho"
          descricao="Ele pode já ter sido submetido. Veja a lista em Meus RDOs."
        />
        <Botao titulo="Voltar" variante="secundaria" onPress={() => router.back()} />
      </View>
    );
  }

  const idsFotos = new Set([
    ...(fotosLocais ?? []).map((f) => f.id_local),
    ...(fotosRemotas ?? []).map((f) => f.id),
  ]);

  function irPara(destino: number) {
    setProblemas([]);
    setEtapa(destino);
    rolagem.current?.scrollTo({ y: 0, animated: false });
  }

  function avancar() {
    if (!r) return;
    const encontrados = problemasDaEtapa(r, etapa);
    if (encontrados.length > 0) {
      setProblemas(encontrados);
      return;
    }
    irPara(Math.min(etapa + 1, ETAPAS.length - 1));
  }

  function pedirSubmissao() {
    if (!r) return;
    const faltas = faltasParaSubmeter(r);
    if (faltas.length > 0) {
      setProblemas(faltas.map((f) => f.mensagem));
      return;
    }

    Alert.alert(
      'Submeter o RDO?',
      'Depois de submetido, o RDO só volta a ser editável se o responsável técnico devolver.',
      [
        { text: 'Revisar mais', style: 'cancel' },
        { text: 'Submeter', onPress: () => void submeter() },
      ],
    );
  }

  async function submeter() {
    setSubmetendo(true);
    setProblemas([]);
    try {
      await gravarAgora();
      const numero = await submeterRdo(id);
      Alert.alert(
        `RDO n. ${numero} submetido`,
        'O responsável técnico foi avisado e vai analisar.',
      );
      // Vai para o detalhe (e não para "Meus RDOs"): quem submete pode ser o
      // Master reenviando uma retificação, e ele não tem essa aba.
      router.replace(`/rdo/ver/${id}`);
    } catch (erro) {
      setProblemas([erro instanceof Error ? erro.message : 'Não foi possível submeter.']);
    } finally {
      setSubmetendo(false);
    }
  }

  const ultima = etapa === ETAPAS.length - 1;
  const props = { r, atualizar };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.topo, { paddingTop: insets.top + espaco.sm }]}>
        <View style={styles.topoLinha}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Fechar. O rascunho fica salvo."
            style={styles.fechar}
          >
            <Feather name="x" size={icone.lg} color={cores.texto} />
          </Pressable>
          <View style={styles.flex}>
            <Texto variante="corpoForte" numberOfLines={1}>
              {r.numero ? `RDO n. ${r.numero}` : 'Novo RDO'}
            </Texto>
            <Texto variante="auxiliar" cor={cores.textoSecundario} numberOfLines={1}>
              {r.obra_nome}
            </Texto>
          </View>
        </View>

        <View style={styles.progresso} accessibilityRole="progressbar">
          {ETAPAS.map((nome, i) => (
            <Pressable
              key={nome}
              onPress={() => irPara(i)}
              accessibilityRole="button"
              accessibilityLabel={`Ir para a etapa ${i + 1}, ${nome}`}
              hitSlop={{ top: 12, bottom: 12 }}
              style={[
                styles.segmento,
                i < etapa && styles.segmentoFeito,
                i === etapa && styles.segmentoAtual,
              ]}
            />
          ))}
        </View>
        <Texto variante="rotulo" cor={cores.textoSecundario}>
          ETAPA {etapa + 1} DE {ETAPAS.length} · {ETAPAS[etapa]?.toUpperCase()}
        </Texto>
      </View>

      <ScrollView
        ref={rolagem}
        style={styles.flex}
        contentContainerStyle={styles.conteudo}
        keyboardShouldPersistTaps="handled"
      >
        {r.devolucao_motivo ? (
          <View style={styles.devolvido}>
            <Feather name="corner-up-left" size={icone.md} color={cores.aviso} />
            <View style={styles.flex}>
              <Texto variante="corpoForte" cor={cores.aviso}>
                Devolvido pelo responsável técnico
              </Texto>
              <Texto variante="auxiliar" cor={cores.aviso}>
                {r.devolucao_motivo}
              </Texto>
            </View>
          </View>
        ) : null}

        <Texto variante="titulo" style={styles.tituloEtapa}>
          {ETAPAS[etapa]}
        </Texto>

        {etapa === 0 && <EtapaIdentificacao {...props} />}
        {etapa === 1 && <EtapaClima {...props} />}
        {etapa === 2 && <EtapaMaoObra {...props} />}
        {etapa === 3 && <EtapaEquipamentos {...props} />}
        {etapa === 4 && <EtapaAtividades {...props} />}
        {etapa === 5 && <EtapaOcorrencias {...props} />}
        {etapa === 6 && <EtapaFotos {...props} />}
        {etapa === 7 && (
          <View style={styles.revisao}>
            <IndicadorSync />
            <EtapaRevisao {...props} irPara={irPara} fotos={idsFotos.size} />
          </View>
        )}
      </ScrollView>

      <View style={[styles.rodape, { paddingBottom: insets.bottom + espaco.md }]}>
        {problemas.length > 0 ? (
          <View style={styles.problemas} accessibilityLiveRegion="assertive">
            {problemas.slice(0, 4).map((p) => (
              <Texto key={p} variante="auxiliar" cor={cores.erro}>
                • {p}
              </Texto>
            ))}
            {problemas.length > 4 ? (
              <Texto variante="auxiliar" cor={cores.erro}>
                … e mais {problemas.length - 4}
              </Texto>
            ) : null}
          </View>
        ) : null}

        <View style={styles.botoes}>
          {etapa > 0 ? (
            <Botao
              titulo="Voltar"
              variante="secundaria"
              iconeEsquerda="arrow-left"
              larguraTotal={false}
              onPress={() => irPara(etapa - 1)}
              estilo={styles.botaoVoltar}
            />
          ) : null}
          {ultima ? (
            <Botao
              titulo="Submeter RDO"
              variante="destaque"
              iconeEsquerda="send"
              carregando={submetendo}
              onPress={pedirSubmissao}
              estilo={styles.flex}
            />
          ) : (
            <Botao
              titulo="Avançar"
              iconeDireita="arrow-right"
              onPress={avancar}
              estilo={styles.flex}
            />
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  vazio: { flex: 1, justifyContent: 'center', padding: espaco.xl, gap: espaco.lg },
  topo: {
    gap: espaco.sm,
    paddingHorizontal: espaco.lg,
    paddingBottom: espaco.md,
    backgroundColor: cores.fundo,
    borderBottomWidth: 1,
    borderBottomColor: cores.borda,
  },
  topoLinha: { flexDirection: 'row', alignItems: 'center', gap: espaco.md },
  fechar: {
    width: 44,
    height: 44,
    borderRadius: raio.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: cores.superficie,
  },
  progresso: { flexDirection: 'row', gap: 4, marginTop: espaco.xs },
  segmento: { flex: 1, height: 6, borderRadius: raio.pill, backgroundColor: cores.superficieForte },
  segmentoFeito: { backgroundColor: cores.primariaClara },
  segmentoAtual: { backgroundColor: cores.destaque },
  conteudo: { padding: espaco.lg, paddingBottom: espaco.xxxl },
  tituloEtapa: { marginBottom: espaco.lg },
  devolvido: {
    flexDirection: 'row',
    gap: espaco.md,
    padding: espaco.lg,
    marginBottom: espaco.lg,
    borderRadius: raio.md,
    backgroundColor: '#FDF3E3',
  },
  revisao: { gap: espaco.lg },
  rodape: {
    gap: espaco.sm,
    paddingTop: espaco.md,
    paddingHorizontal: espaco.lg,
    backgroundColor: cores.fundo,
    borderTopWidth: 1,
    borderTopColor: cores.borda,
    ...sombra.cartao,
  },
  problemas: {
    gap: 2,
    padding: espaco.md,
    borderRadius: raio.sm,
    backgroundColor: '#FBE9E7',
  },
  botoes: { flexDirection: 'row', gap: espaco.md },
  botaoVoltar: { minWidth: 120 },
});
