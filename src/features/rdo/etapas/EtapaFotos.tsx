import { Feather } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { Botao, Campo, EstadoVazio, Texto } from '@/components/ui';
import { useAuth } from '@/features/auth/useAuth';
import { listarFotosRemotas, removerFotoRemota } from '@/features/fotos/api';
import { apagarArquivoLocal, capturarFoto, type Origem } from '@/features/fotos/processar';
import { useStatusConexao } from '@/features/sync/hooks';
import { useFilaStore } from '@/features/sync/store';
import { adicionarFoto, listarFotosDoRdo, removerFoto, type VinculoFoto } from '@/lib/db-local';
import { agendarSincronizacao } from '@/lib/sync';
import { cores, espaco, icone, raio } from '@/theme/tokens';
import { novoId } from '../rascunho';
import type { PropsEtapa } from './comum';

const LEGENDA_MINIMA = 5;

type FotoNaTela = {
  id: string;
  imagem: string | null;
  legenda: string;
  vinculo: VinculoFoto;
  situacao: 'local' | 'enviando' | 'enviada' | 'erro';
  erro: string | null;
  storagePath: string | null;
  local: { uri: string } | null;
};

type Nova = { id: string; uri: string };

export function EtapaFotos({ r }: PropsEtapa) {
  const { sessao } = useAuth();
  const autorId = sessao?.user.id ?? '';
  const { online } = useStatusConexao();
  const versao = useFilaStore((e) => e.versao);
  const cliente = useQueryClient();

  const [capturando, setCapturando] = useState(false);
  const [nova, setNova] = useState<Nova | null>(null);
  const [legenda, setLegenda] = useState('');
  const [vinculo, setVinculo] = useState<VinculoFoto>(null);
  const [salvando, setSalvando] = useState(false);

  const { data: locais } = useQuery({
    queryKey: ['fotos-locais', r.id, versao],
    queryFn: () => listarFotosDoRdo(r.id),
  });

  const { data: remotas } = useQuery({
    queryKey: ['fotos-remotas', r.id, versao],
    queryFn: () => listarFotosRemotas(r.id),
    enabled: online && r.numero !== null,
  });

  const recarregar = () =>
    Promise.all([
      cliente.invalidateQueries({ queryKey: ['fotos-locais', r.id] }),
      cliente.invalidateQueries({ queryKey: ['fotos-remotas', r.id] }),
    ]);

  const fotos: FotoNaTela[] = [];
  const vistas = new Set<string>();

  for (const f of locais ?? []) {
    vistas.add(f.id_local);
    fotos.push({
      id: f.id_local,
      imagem: f.uri,
      legenda: f.legenda,
      vinculo: f.vinculo,
      situacao:
        f.status_sync === 'sincronizado'
          ? 'enviada'
          : f.status_sync === 'erro'
            ? 'erro'
            : f.status_sync === 'sincronizando'
              ? 'enviando'
              : 'local',
      erro: f.erro,
      storagePath: f.storage_path,
      local: { uri: f.uri },
    });
  }

  for (const f of remotas ?? []) {
    if (vistas.has(f.id)) continue;
    fotos.push({
      id: f.id,
      imagem: f.url,
      legenda: f.legenda,
      vinculo: f.atividade_id
        ? { tipo: 'atividade', id: f.atividade_id }
        : f.ocorrencia_id
          ? { tipo: 'ocorrencia', id: f.ocorrencia_id }
          : null,
      situacao: 'enviada',
      erro: null,
      storagePath: f.storage_path,
      local: null,
    });
  }

  const opcoesVinculo: { chave: string; rotulo: string; valor: VinculoFoto }[] = [
    { chave: 'nenhum', rotulo: 'Sem vínculo (foto geral do dia)', valor: null },
    ...r.atividades.map((a, i) => ({
      chave: `a-${a.id}`,
      rotulo: `Atividade: ${a.servico.trim() || `Atividade ${i + 1}`}${a.local ? ` — ${a.local}` : ''}`,
      valor: { tipo: 'atividade' as const, id: a.id },
    })),
    ...r.ocorrencias.map((o, i) => ({
      chave: `o-${o.id}`,
      rotulo: `Ocorrência: ${o.descricao.trim().slice(0, 40) || `Ocorrência ${i + 1}`}`,
      valor: { tipo: 'ocorrencia' as const, id: o.id },
    })),
  ];

  function rotuloVinculo(v: VinculoFoto): string | null {
    if (!v) return null;
    return opcoesVinculo.find((o) => o.valor?.id === v.id)?.rotulo ?? null;
  }

  async function capturar(origem: Origem) {
    setCapturando(true);
    try {
      const id = novoId();
      const resultado = await capturarFoto(origem, id);
      if (resultado.tipo === 'sem_permissao') {
        Alert.alert('Permissão necessária', resultado.mensagem);
        return;
      }
      if (resultado.tipo === 'cancelado') return;
      setLegenda('');
      setVinculo(null);
      setNova({ id, uri: resultado.uri });
    } catch (erro) {
      Alert.alert('Não foi possível usar a foto', erro instanceof Error ? erro.message : '');
    } finally {
      setCapturando(false);
    }
  }

  function descartarNova() {
    if (nova) apagarArquivoLocal(nova.uri);
    setNova(null);
  }

  async function salvarNova() {
    if (!nova || legenda.trim().length < LEGENDA_MINIMA) return;
    setSalvando(true);
    try {
      await adicionarFoto({
        id_local: nova.id,
        rdo_id_local: r.id,
        autor_id: autorId,
        uri: nova.uri,
        legenda: legenda.trim(),
        vinculo,
        capturada_em: new Date().toISOString(),
      });
      setNova(null);
      await recarregar();
      agendarSincronizacao(500);
    } finally {
      setSalvando(false);
    }
  }

  function remover(foto: FotoNaTela) {
    Alert.alert('Remover foto', 'A foto sai do RDO. Esta ação não pode ser desfeita.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: async () => {
          try {
            if (foto.storagePath && foto.situacao === 'enviada') {
              await removerFotoRemota({ id: foto.id, storage_path: foto.storagePath });
            }
            if (foto.local) {
              await removerFoto(foto.id);
              apagarArquivoLocal(foto.local.uri);
            }
            await recarregar();
            agendarSincronizacao(0);
          } catch (erro) {
            Alert.alert('Não foi possível remover', erro instanceof Error ? erro.message : '');
          }
        },
      },
    ]);
  }

  const legendaCurta = legenda.trim().length < LEGENDA_MINIMA;

  return (
    <View style={styles.base}>
      <Texto variante="corpo" cor={cores.textoSecundario}>
        Toda foto precisa de legenda. Sem legenda, a foto não entra no RDO.
      </Texto>

      <View style={styles.acoes}>
        <Botao
          titulo="Câmera"
          iconeEsquerda="camera"
          carregando={capturando}
          onPress={() => void capturar('camera')}
          larguraTotal={false}
          estilo={styles.acao}
        />
        <Botao
          titulo="Galeria"
          variante="secundaria"
          iconeEsquerda="image"
          desabilitado={capturando}
          onPress={() => void capturar('galeria')}
          larguraTotal={false}
          estilo={styles.acao}
        />
      </View>

      {fotos.length === 0 ? (
        <EstadoVazio
          icone="camera"
          titulo="Nenhuma foto ainda"
          descricao="Registre o serviço executado e as ocorrências. Funciona sem internet."
        />
      ) : (
        <View style={styles.grade}>
          {fotos.map((foto) => (
            <View key={foto.id} style={styles.foto}>
              {foto.imagem ? (
                <Image
                  source={{ uri: foto.imagem }}
                  style={styles.imagem}
                  accessibilityLabel={foto.legenda}
                />
              ) : (
                <View style={[styles.imagem, styles.semImagem]}>
                  <Feather name="image" size={icone.lg} color={cores.textoDesabilitado} />
                </View>
              )}
              <View style={styles.fotoTextos}>
                <Texto variante="corpoForte" numberOfLines={2}>
                  {foto.legenda}
                </Texto>
                {rotuloVinculo(foto.vinculo) ? (
                  <Texto variante="auxiliar" cor={cores.textoSecundario} numberOfLines={1}>
                    {rotuloVinculo(foto.vinculo)}
                  </Texto>
                ) : null}
                <View style={styles.situacao}>
                  {foto.situacao === 'enviando' ? (
                    <ActivityIndicator size="small" color={cores.primaria} />
                  ) : (
                    <Feather
                      name={
                        foto.situacao === 'enviada'
                          ? 'check-circle'
                          : foto.situacao === 'erro'
                            ? 'alert-circle'
                            : 'clock'
                      }
                      size={14}
                      color={
                        foto.situacao === 'enviada'
                          ? cores.sucesso
                          : foto.situacao === 'erro'
                            ? cores.erro
                            : cores.aviso
                      }
                    />
                  )}
                  <Texto
                    variante="auxiliar"
                    cor={foto.situacao === 'erro' ? cores.erro : cores.textoSecundario}
                    numberOfLines={2}
                    style={styles.flex}
                  >
                    {foto.situacao === 'enviada'
                      ? 'Enviada'
                      : foto.situacao === 'enviando'
                        ? 'Enviando…'
                        : foto.situacao === 'erro'
                          ? (foto.erro ?? 'Falha no envio')
                          : 'Aguardando envio'}
                  </Texto>
                </View>
              </View>
              <Pressable
                onPress={() => remover(foto)}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={`Remover a foto ${foto.legenda}`}
                style={styles.remover}
              >
                <Feather name="trash-2" size={icone.sm} color={cores.erro} />
              </Pressable>
            </View>
          ))}
        </View>
      )}

      <Modal visible={nova !== null} animationType="slide" onRequestClose={descartarNova}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView contentContainerStyle={styles.modal} keyboardShouldPersistTaps="handled">
            <Texto variante="titulo">Legenda da foto</Texto>
            {nova ? (
              <Image source={{ uri: nova.uri }} style={styles.previa} accessibilityLabel="Prévia" />
            ) : null}

            <Campo
              rotulo="Legenda"
              obrigatorio
              multiline
              autoFocus
              placeholder="Ex.: Alvenaria do pavimento 3, face norte"
              value={legenda}
              onChangeText={setLegenda}
              ajuda={`Mínimo de ${LEGENDA_MINIMA} caracteres. Descreva o que aparece e onde.`}
              erro={
                legenda.length > 0 && legendaCurta
                  ? `Faltam ${LEGENDA_MINIMA - legenda.trim().length} caractere(s)`
                  : undefined
              }
            />

            <View style={styles.vinculos}>
              <Texto variante="auxiliar" cor={cores.textoSecundario}>
                Vincular a
              </Texto>
              {opcoesVinculo.map((opcao) => {
                const ativo = (vinculo?.id ?? null) === (opcao.valor?.id ?? null);
                return (
                  <Pressable
                    key={opcao.chave}
                    onPress={() => setVinculo(opcao.valor)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: ativo }}
                    accessibilityLabel={opcao.rotulo}
                    style={[styles.vinculo, ativo && styles.vinculoAtivo]}
                  >
                    <Feather
                      name={ativo ? 'check-circle' : 'circle'}
                      size={icone.md}
                      color={ativo ? cores.primaria : cores.textoDesabilitado}
                    />
                    <Texto variante="corpo" style={styles.flex} numberOfLines={2}>
                      {opcao.rotulo}
                    </Texto>
                  </Pressable>
                );
              })}
            </View>

            <Botao
              titulo="Salvar foto"
              iconeEsquerda="check"
              desabilitado={legendaCurta}
              carregando={salvando}
              onPress={() => void salvarNova()}
            />
            <Botao titulo="Descartar" variante="fantasma" onPress={descartarNova} />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  base: { gap: espaco.lg },
  flex: { flex: 1 },
  acoes: { flexDirection: 'row', gap: espaco.md },
  acao: { flex: 1 },
  grade: { gap: espaco.md },
  foto: {
    flexDirection: 'row',
    gap: espaco.md,
    padding: espaco.sm,
    borderRadius: raio.md,
    borderWidth: 1,
    borderColor: cores.borda,
  },
  imagem: { width: 88, height: 88, borderRadius: raio.sm, backgroundColor: cores.superficie },
  semImagem: { alignItems: 'center', justifyContent: 'center' },
  fotoTextos: { flex: 1, gap: 4, paddingVertical: 2 },
  situacao: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  remover: { padding: espaco.sm },
  modal: { gap: espaco.lg, padding: espaco.xl, paddingTop: espaco.xxxl },
  previa: { width: '100%', aspectRatio: 4 / 3, borderRadius: raio.md },
  vinculos: { gap: espaco.sm },
  vinculo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.md,
    minHeight: 48,
    paddingHorizontal: espaco.md,
    borderRadius: raio.sm,
    borderWidth: 1,
    borderColor: cores.borda,
  },
  vinculoAtivo: { borderColor: cores.primaria, backgroundColor: '#F2F6FB' },
});
