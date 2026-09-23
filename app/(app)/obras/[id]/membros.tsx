import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { ALTURA_BARRA_ABAS } from '@/components/BarraAbas';
import { Botao, Carregando, EstadoVazio, Seletor, Tela, Texto } from '@/components/ui';
import { useAuth } from '@/features/auth/useAuth';
import type { Papel } from '@/features/obras/api';
import {
  useDesvincularMembro,
  useMembros,
  useObra,
  usePerfisDaEmpresa,
  useVincularMembro,
} from '@/features/obras/hooks';
import { cores, espaco, icone, raio } from '@/theme/tokens';

const PAPEIS: { valor: Papel; rotulo: string }[] = [
  { valor: 'master', rotulo: 'Responsável técnico' },
  { valor: 'operacional', rotulo: 'Equipe de campo' },
  { valor: 'cliente', rotulo: 'Contratante' },
];

const ROTULO_PAPEL: Record<string, string> = {
  master: 'Responsável técnico',
  operacional: 'Equipe de campo',
  cliente: 'Contratante',
};

export default function MembrosDaObra() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { perfil: meuPerfil } = useAuth();

  const { data: obra } = useObra(id);
  const { data: membros, isPending } = useMembros(id);
  const { data: perfis } = usePerfisDaEmpresa();

  const vincular = useVincularMembro(id);
  const desvincular = useDesvincularMembro(id);

  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [papelEscolhido, setPapelEscolhido] = useState<Papel>('operacional');
  const [erro, setErro] = useState<string | null>(null);

  const vinculados = useMemo(() => new Set((membros ?? []).map((m) => m.usuario_id)), [membros]);

  const disponiveis = useMemo(
    () => (perfis ?? []).filter((p) => !vinculados.has(p.id)),
    [perfis, vinculados],
  );

  if (isPending) return <Carregando mensagem="Carregando equipe" />;

  async function adicionar() {
    if (!selecionado) return;
    setErro(null);
    try {
      await vincular.mutateAsync({ usuarioId: selecionado, papel: papelEscolhido });
      setSelecionado(null);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível vincular.');
    }
  }

  function confirmarRemocao(usuarioId: string, nome: string) {
    const souEu = usuarioId === meuPerfil?.id;

    Alert.alert(
      'Desvincular da obra',
      souEu
        ? `Você vai perder o acesso a esta obra. Outro responsável técnico precisará vincular você de volta.`
        : `${nome} deixa de enxergar esta obra e os RDOs dela. Nenhum registro é apagado.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desvincular',
          style: 'destructive',
          onPress: () => {
            desvincular.mutate(usuarioId, {
              onSuccess: () => {
                if (souEu) router.replace('/obras');
              },
              onError: (e) => setErro(e instanceof Error ? e.message : 'Falhou.'),
            });
          },
        },
      ],
    );
  }

  return (
    <Tela folgaInferior={ALTURA_BARRA_ABAS}>
      <Botao
        titulo="Voltar"
        variante="fantasma"
        iconeEsquerda="arrow-left"
        larguraTotal={false}
        onPress={() => router.back()}
      />

      <Texto variante="display" style={styles.titulo}>
        Equipe
      </Texto>
      <Texto variante="corpo" cor={cores.textoSecundario} style={styles.intro}>
        {obra?.nome}
      </Texto>

      <View style={styles.secao}>
        <Texto variante="subtitulo">Vinculados</Texto>

        {!membros || membros.length === 0 ? (
          <EstadoVazio icone="users" titulo="Ninguém vinculado" />
        ) : (
          <View style={styles.lista}>
            {membros.map((membro) => (
              <View key={membro.usuario_id} style={styles.membro}>
                <View style={styles.chip}>
                  <Feather name="user" size={icone.sm} color={cores.primaria} />
                </View>
                <View style={styles.textos}>
                  <Texto variante="corpoForte" numberOfLines={1}>
                    {membro.perfis?.nome ?? 'Usuário'}
                  </Texto>
                  <Texto variante="auxiliar" cor={cores.textoSecundario} numberOfLines={1}>
                    {ROTULO_PAPEL[membro.papel] ?? membro.papel} · {membro.perfis?.email}
                  </Texto>
                </View>
                <Pressable
                  onPress={() =>
                    confirmarRemocao(membro.usuario_id, membro.perfis?.nome ?? 'Este usuário')
                  }
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel={`Desvincular ${membro.perfis?.nome ?? 'usuário'}`}
                  style={styles.remover}
                >
                  <Feather name="x" size={icone.md} color={cores.erro} />
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={styles.secao}>
        <Texto variante="subtitulo">Adicionar da empresa</Texto>

        {disponiveis.length === 0 ? (
          <EstadoVazio
            icone="user-check"
            titulo="Todo mundo já está vinculado"
            descricao="Novos usuários precisam ser criados no painel do Supabase."
          />
        ) : (
          <>
            <View style={styles.lista}>
              {disponiveis.map((p) => {
                const ativo = selecionado === p.id;
                return (
                  <Pressable
                    key={p.id}
                    onPress={() => {
                      setSelecionado(ativo ? null : p.id);
                      setPapelEscolhido(p.papel);
                    }}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: ativo }}
                    accessibilityLabel={p.nome}
                    style={[styles.membro, ativo && styles.membroSelecionado]}
                  >
                    <View style={styles.chip}>
                      <Feather
                        name={ativo ? 'check' : 'user-plus'}
                        size={icone.sm}
                        color={cores.primaria}
                      />
                    </View>
                    <View style={styles.textos}>
                      <Texto variante="corpoForte" numberOfLines={1}>
                        {p.nome}
                      </Texto>
                      <Texto variante="auxiliar" cor={cores.textoSecundario} numberOfLines={1}>
                        {p.email}
                      </Texto>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            {selecionado ? (
              <View style={styles.formVinculo}>
                <Seletor
                  rotulo="Papel nesta obra"
                  opcoes={PAPEIS}
                  valor={papelEscolhido}
                  onChange={setPapelEscolhido}
                  ajuda="O papel vale só para esta obra."
                />
                <Botao
                  titulo="Vincular à obra"
                  iconeEsquerda="user-plus"
                  carregando={vincular.isPending}
                  onPress={() => void adicionar()}
                />
              </View>
            ) : null}
          </>
        )}

        {erro ? (
          <View style={styles.aviso} accessibilityLiveRegion="polite">
            <Texto variante="auxiliar" cor={cores.erro}>
              {erro}
            </Texto>
          </View>
        ) : null}
      </View>
    </Tela>
  );
}

const styles = StyleSheet.create({
  titulo: { marginTop: espaco.lg },
  intro: { marginBottom: espaco.lg },
  secao: { gap: espaco.md, marginTop: espaco.xl },
  lista: { gap: espaco.sm },
  membro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.md,
    padding: espaco.md,
    borderRadius: raio.sm,
    backgroundColor: cores.superficie,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  membroSelecionado: { borderColor: cores.primaria, backgroundColor: cores.fundo },
  chip: {
    width: 36,
    height: 36,
    borderRadius: raio.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: cores.fundo,
  },
  textos: { flex: 1, gap: 2 },
  remover: { padding: espaco.sm },
  formVinculo: { gap: espaco.lg, marginTop: espaco.md },
  aviso: {
    backgroundColor: '#FBE9E7',
    borderRadius: raio.sm,
    padding: espaco.md,
  },
});
