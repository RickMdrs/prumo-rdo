import { Feather } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { ALTURA_BARRA_ABAS } from '@/components/BarraAbas';
import { CabecalhoTela } from '@/components/CabecalhoTela';
import { Botao, Carregando, EstadoVazio, Seletor, Tela, Texto } from '@/components/ui';
import { useAuth } from '@/features/auth/useAuth';
import {
  contarNaoLidas,
  listarNotificacoes,
  marcarLida,
  marcarTodasLidas,
  type Notificacao,
} from '@/features/notificacoes/api';
import { useAvisosStore } from '@/features/notificacoes/store';
import { formatarDataHora } from '@/lib/datas';
import { cores, espaco, icone, raio } from '@/theme/tokens';

type Filtro = 'nao_lidas' | 'todas';

const FILTROS: { valor: Filtro; rotulo: string }[] = [
  { valor: 'nao_lidas', rotulo: 'Não lidas' },
  { valor: 'todas', rotulo: 'Todas' },
];

const ICONE: Record<string, keyof typeof Feather.glyphMap> = {
  rdo_submetido: 'send',
  rdo_devolvido: 'corner-up-left',
  rdo_validado: 'check-circle',
  rdo_para_ciencia: 'edit-3',
  rdo_finalizado: 'award',
  rdo_esclarecimento: 'help-circle',
  rdo_retificado: 'git-branch',
  rdo_cancelado: 'x-octagon',
};

export default function Notificacoes() {
  const router = useRouter();
  const { sessao } = useAuth();
  const versao = useAvisosStore((e) => e.versao);
  const definirNaoLidas = useAvisosStore((e) => e.definirNaoLidas);
  const [filtro, setFiltro] = useState<Filtro>('nao_lidas');
  const [marcando, setMarcando] = useState(false);

  const consulta = useQuery({
    queryKey: ['notificacoes', versao],
    queryFn: listarNotificacoes,
  });

  useFocusEffect(
    useCallback(() => {
      void consulta.refetch();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  async function atualizarContagem() {
    definirNaoLidas(await contarNaoLidas());
    await consulta.refetch();
  }

  async function abrir(n: Notificacao) {
    if (!n.lida) {
      await marcarLida(n.id).catch(() => undefined);
      void atualizarContagem();
    }
    if (n.rdo_id) router.push(`/rdo/ver/${n.rdo_id}`);
  }

  async function marcarTodas() {
    if (!sessao) return;
    setMarcando(true);
    try {
      await marcarTodasLidas(sessao.user.id);
      await atualizarContagem();
    } catch (e) {
      Alert.alert('Não foi possível marcar', e instanceof Error ? e.message : '');
    } finally {
      setMarcando(false);
    }
  }

  if (consulta.isPending) return <Carregando mensagem="Carregando avisos" />;

  const todas = consulta.data ?? [];
  const lista = filtro === 'nao_lidas' ? todas.filter((n) => !n.lida) : todas;
  const temNaoLidas = todas.some((n) => !n.lida);

  return (
    <Tela folgaInferior={ALTURA_BARRA_ABAS}>
      <CabecalhoTela titulo="Avisos" subtitulo="O que aconteceu nos seus RDOs" />

      <View style={styles.topo}>
        <Seletor opcoes={FILTROS} valor={filtro} onChange={setFiltro} />
        {temNaoLidas ? (
          <Botao
            titulo="Marcar todas como lidas"
            variante="fantasma"
            iconeEsquerda="check-square"
            tamanho="md"
            carregando={marcando}
            onPress={() => void marcarTodas()}
          />
        ) : null}
      </View>

      {consulta.error ? (
        <View style={styles.lista}>
          <EstadoVazio
            icone="wifi-off"
            titulo="Não foi possível carregar"
            descricao={consulta.error.message}
          />
          <Botao
            titulo="Tentar de novo"
            variante="secundaria"
            onPress={() => void consulta.refetch()}
          />
        </View>
      ) : lista.length === 0 ? (
        <EstadoVazio
          icone="bell"
          titulo={filtro === 'nao_lidas' ? 'Nada novo' : 'Nenhum aviso'}
          descricao="Submissões, devoluções, validações e assinaturas aparecem aqui na hora."
        />
      ) : (
        <View style={styles.lista}>
          {lista.map((n) => (
            <Pressable
              key={n.id}
              onPress={() => void abrir(n)}
              accessibilityRole="button"
              accessibilityLabel={`${n.lida ? '' : 'Não lida. '}${n.titulo}`}
              style={[styles.item, !n.lida && styles.itemNaoLido]}
            >
              <View style={[styles.chip, !n.lida && styles.chipNaoLido]}>
                <Feather
                  name={ICONE[n.tipo] ?? 'bell'}
                  size={icone.md}
                  color={n.lida ? cores.textoSecundario : cores.sobrePrimaria}
                />
              </View>
              <View style={styles.textos}>
                <Texto variante={n.lida ? 'corpo' : 'corpoForte'}>{n.titulo}</Texto>
                {n.corpo ? (
                  <Texto variante="auxiliar" cor={cores.textoSecundario} numberOfLines={3}>
                    {n.corpo}
                  </Texto>
                ) : null}
                <Texto variante="auxiliar" cor={cores.textoDesabilitado}>
                  {formatarDataHora(n.created_at)}
                </Texto>
              </View>
              {!n.lida ? <View style={styles.ponto} accessibilityLabel="Não lida" /> : null}
            </Pressable>
          ))}
        </View>
      )}
    </Tela>
  );
}

const styles = StyleSheet.create({
  topo: { gap: espaco.sm, marginBottom: espaco.lg },
  lista: { gap: espaco.sm },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.md,
    padding: espaco.lg,
    borderRadius: raio.md,
    backgroundColor: cores.superficie,
  },
  itemNaoLido: { backgroundColor: '#EEF3F9', borderWidth: 1, borderColor: '#D5E0EE' },
  chip: {
    width: 44,
    height: 44,
    borderRadius: raio.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: cores.fundo,
  },
  chipNaoLido: { backgroundColor: cores.primaria },
  textos: { flex: 1, gap: 2 },
  ponto: { width: 10, height: 10, borderRadius: raio.pill, backgroundColor: cores.destaque },
});
