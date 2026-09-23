import { Feather } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ALTURA_BARRA_ABAS } from '@/components/BarraAbas';
import { CabecalhoTela } from '@/components/CabecalhoTela';
import { Carregando, EstadoVazio, StatusBadge, Texto } from '@/components/ui';
import { useAuth } from '@/features/auth/useAuth';
import { baixarRdoParaEdicao, listarMeusRdosRemotos } from '@/features/rdo/remoto';
import { IndicadorSync } from '@/features/sync/IndicadorSync';
import { useFilaStore } from '@/features/sync/store';
import { listarRdosLocais, type RdoLocal } from '@/lib/db-local';
import { formatarData } from '@/lib/datas';
import { sincronizar } from '@/lib/sync';
import { statusVisual } from '@/theme/status';
import { cores, espaco, icone, raio } from '@/theme/tokens';

const SYNC: Record<
  RdoLocal['status_sync'],
  { texto: string; cor: string; icone: 'clock' | 'upload-cloud' | 'check-circle' | 'alert-circle' }
> = {
  pendente: { texto: 'Aguardando envio', cor: cores.aviso, icone: 'clock' },
  sincronizando: { texto: 'Enviando…', cor: cores.primaria, icone: 'upload-cloud' },
  sincronizado: { texto: 'Salvo no servidor', cor: cores.sucesso, icone: 'check-circle' },
  erro: { texto: 'Falha no envio', cor: cores.erro, icone: 'alert-circle' },
};

export default function MeusRdos() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { sessao } = useAuth();
  const autorId = sessao?.user.id ?? '';
  const versao = useFilaStore((e) => e.versao);
  const [abrindo, setAbrindo] = useState<string | null>(null);

  const locais = useQuery({
    queryKey: ['rdos-locais', autorId, versao],
    queryFn: () => listarRdosLocais(autorId),
    enabled: Boolean(autorId),
  });

  const remotos = useQuery({
    queryKey: ['meus-rdos', autorId, versao],
    queryFn: () => listarMeusRdosRemotos(autorId),
    enabled: Boolean(autorId),
  });

  useFocusEffect(
    useCallback(() => {
      void locais.refetch();
      void remotos.refetch();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  async function corrigir(rdoId: string) {
    setAbrindo(rdoId);
    try {
      await baixarRdoParaEdicao(rdoId, autorId);
      router.push(`/rdo/${rdoId}`);
    } catch (e) {
      Alert.alert('Não foi possível abrir', e instanceof Error ? e.message : '');
    } finally {
      setAbrindo(null);
    }
  }

  if (locais.isPending) return <Carregando mensagem="Carregando seus RDOs" />;

  const idsLocais = new Set((locais.data ?? []).map((l) => l.id_local));
  const remotosFora = (remotos.data ?? []).filter((r) => !idsLocais.has(r.id));
  const paraCorrigir = remotosFora.filter((r) => r.status === 'rascunho');
  const enviados = remotosFora.filter((r) => r.status !== 'rascunho');

  const nada = (locais.data ?? []).length === 0 && remotosFora.length === 0;

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
          refreshing={remotos.isRefetching}
          onRefresh={() => {
            void sincronizar();
            void remotos.refetch();
            void locais.refetch();
          }}
          tintColor={cores.primaria}
        />
      }
    >
      <CabecalhoTela titulo="Meus RDOs" subtitulo="Rascunhos, devolvidos e enviados" />
      <IndicadorSync />

      {nada ? (
        <EstadoVazio
          icone="clipboard"
          titulo="Nenhum RDO ainda"
          descricao="Toque em Novo RDO na barra de baixo para registrar o dia."
        />
      ) : null}

      {(locais.data ?? []).length > 0 ? (
        <View style={styles.secao}>
          <Texto variante="subtitulo">Em edição</Texto>
          {(locais.data ?? []).map((l) => {
            const s = SYNC[l.status_sync];
            return (
              <Pressable
                key={l.id_local}
                onPress={() => router.push(`/rdo/${l.id_local}`)}
                accessibilityRole="button"
                accessibilityLabel={`Continuar ${l.rascunho.numero ? `RDO número ${l.rascunho.numero}` : 'rascunho'}`}
                style={[styles.cartao, l.rascunho.devolucao_motivo && styles.cartaoDevolvido]}
              >
                <View style={styles.linha}>
                  <Texto variante="corpoForte" style={styles.flex}>
                    {l.rascunho.numero ? `RDO n. ${l.rascunho.numero}` : 'Rascunho sem número'}
                  </Texto>
                  <StatusBadge status={l.rascunho.devolucao_motivo ? 'devolvido' : 'rascunho'} />
                </View>
                <Texto variante="auxiliar" cor={cores.textoSecundario}>
                  {l.rascunho.obra_nome} · {formatarData(l.rascunho.data)}
                </Texto>
                {l.rascunho.devolucao_motivo ? (
                  <Texto variante="auxiliar" cor={cores.aviso} numberOfLines={3}>
                    Motivo: {l.rascunho.devolucao_motivo}
                  </Texto>
                ) : null}
                <View style={styles.sync}>
                  <Feather name={s.icone} size={14} color={s.cor} />
                  <Texto variante="auxiliar" cor={s.cor} numberOfLines={2} style={styles.flex}>
                    {l.status_sync === 'erro' && l.erro ? l.erro : s.texto}
                  </Texto>
                </View>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {paraCorrigir.length > 0 ? (
        <View style={styles.secao}>
          <Texto variante="subtitulo">Para corrigir</Texto>
          {paraCorrigir.map((r) => (
            <Pressable
              key={r.id}
              onPress={() => void corrigir(r.id)}
              disabled={abrindo !== null}
              accessibilityRole="button"
              accessibilityLabel={`Corrigir RDO número ${r.numero}`}
              style={[styles.cartao, r.devolucao_motivo && styles.cartaoDevolvido]}
            >
              <View style={styles.linha}>
                <Texto variante="corpoForte" style={styles.flex}>
                  RDO n. {r.numero}
                </Texto>
                <StatusBadge status={statusVisual(r.status, r.devolucao_motivo)} />
              </View>
              <Texto variante="auxiliar" cor={cores.textoSecundario}>
                {r.obras?.nome} · {formatarData(r.data)}
              </Texto>
              {r.devolucao_motivo ? (
                <Texto variante="auxiliar" cor={cores.aviso} numberOfLines={3}>
                  Motivo: {r.devolucao_motivo}
                </Texto>
              ) : null}
              <View style={styles.sync}>
                <Feather name="edit-3" size={14} color={cores.primaria} />
                <Texto variante="auxiliar" cor={cores.primaria}>
                  {abrindo === r.id ? 'Abrindo…' : 'Toque para corrigir e reenviar'}
                </Texto>
              </View>
            </Pressable>
          ))}
        </View>
      ) : null}

      {enviados.length > 0 ? (
        <View style={styles.secao}>
          <Texto variante="subtitulo">Enviados</Texto>
          {enviados.map((r) => (
            <Pressable
              key={r.id}
              onPress={() => router.push(`/rdo/ver/${r.id}`)}
              accessibilityRole="button"
              accessibilityLabel={`Ver RDO número ${r.numero}`}
              style={styles.cartao}
            >
              <View style={styles.linha}>
                <Texto variante="corpoForte" style={styles.flex}>
                  RDO n. {r.numero}
                </Texto>
                <StatusBadge status={statusVisual(r.status, r.devolucao_motivo)} />
              </View>
              <View style={styles.linha}>
                <Texto variante="auxiliar" cor={cores.textoSecundario} style={styles.flex}>
                  {r.obras?.nome} · {formatarData(r.data)}
                </Texto>
                <Feather name="lock" size={icone.sm} color={cores.textoDesabilitado} />
              </View>
            </Pressable>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo },
  conteudo: { paddingHorizontal: espaco.lg, gap: espaco.md },
  flex: { flex: 1 },
  secao: { gap: espaco.md, marginTop: espaco.lg },
  cartao: {
    gap: espaco.xs,
    padding: espaco.lg,
    borderRadius: raio.md,
    backgroundColor: cores.superficie,
  },
  cartaoDevolvido: { backgroundColor: '#FDF3E3', borderWidth: 1, borderColor: '#F3D5A6' },
  linha: { flexDirection: 'row', alignItems: 'center', gap: espaco.sm },
  sync: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: espaco.xs },
});
