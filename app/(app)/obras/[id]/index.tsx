import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { ALTURA_BARRA_ABAS } from '@/components/BarraAbas';
import { Botao, Carregando, EstadoVazio, StatusBadge, Tela, Texto } from '@/components/ui';
import { useDefinirObraAtiva, useMembros, useObra, useRdosDaObra } from '@/features/obras/hooks';
import { formatarData } from '@/lib/datas';
import { statusVisual } from '@/theme/status';
import { cores, espaco, icone, raio } from '@/theme/tokens';

const ROTULO_PAPEL: Record<string, string> = {
  master: 'Responsável técnico',
  operacional: 'Equipe de campo',
  cliente: 'Contratante',
};

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <View style={styles.linha}>
      <Texto variante="auxiliar" cor={cores.textoSecundario}>
        {rotulo}
      </Texto>
      <Texto variante="corpo" style={styles.linhaValor}>
        {valor}
      </Texto>
    </View>
  );
}

export default function DetalheObra() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { data: obra, isPending } = useObra(id);
  const { data: membros } = useMembros(id);
  const { data: rdos } = useRdosDaObra(id);
  const alternarAtiva = useDefinirObraAtiva(id);

  if (isPending || !obra) return <Carregando mensagem="Carregando obra" />;

  function confirmarInativacao() {
    if (!obra) return;
    const inativando = obra.ativa;

    Alert.alert(
      inativando ? 'Inativar obra' : 'Reativar obra',
      inativando
        ? 'A obra sai da lista de quem registra RDO. Nenhum registro é apagado, e você pode reativar depois.'
        : 'A obra volta a aceitar novos RDOs.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: inativando ? 'Inativar' : 'Reativar',
          style: inativando ? 'destructive' : 'default',
          onPress: () => alternarAtiva.mutate(!obra.ativa),
        },
      ],
    );
  }

  return (
    <Tela folgaInferior={ALTURA_BARRA_ABAS}>
      <Botao
        titulo="Obras"
        variante="fantasma"
        iconeEsquerda="arrow-left"
        larguraTotal={false}
        onPress={() => router.back()}
      />

      <View style={styles.cabecalho}>
        <Texto variante="titulo">{obra.nome}</Texto>
        {!obra.ativa ? (
          <View style={styles.etiquetaInativa}>
            <Texto variante="rotulo" cor={cores.textoSecundario}>
              INATIVA
            </Texto>
          </View>
        ) : null}
      </View>

      <View style={styles.cartao}>
        <Linha rotulo="Contrato" valor={obra.contrato ?? '—'} />
        <Linha rotulo="Cliente" valor={obra.cliente_nome ?? '—'} />
        <Linha rotulo="Endereço" valor={obra.endereco ?? '—'} />
        <Linha rotulo="Início" valor={formatarData(obra.inicio)} />
        <Linha rotulo="Término previsto" valor={formatarData(obra.fim_previsto)} />
        <Linha rotulo="Fuso" valor={obra.fuso} />
      </View>

      <View style={styles.acoes}>
        <Botao
          titulo="Editar dados"
          variante="secundaria"
          iconeEsquerda="edit-2"
          onPress={() => router.push(`/obras/${id}/editar`)}
        />
        <Botao
          titulo={obra.ativa ? 'Inativar obra' : 'Reativar obra'}
          variante={obra.ativa ? 'perigo' : 'secundaria'}
          iconeEsquerda={obra.ativa ? 'archive' : 'rotate-ccw'}
          carregando={alternarAtiva.isPending}
          onPress={confirmarInativacao}
        />
      </View>

      <View style={styles.secao}>
        <View style={styles.secaoCabecalho}>
          <Texto variante="subtitulo" style={styles.secaoTitulo}>
            Equipe
          </Texto>
          <Botao
            titulo="Gerenciar"
            variante="fantasma"
            larguraTotal={false}
            tamanho="md"
            onPress={() => router.push(`/obras/${id}/membros`)}
          />
        </View>

        {!membros || membros.length === 0 ? (
          <EstadoVazio
            icone="users"
            titulo="Ninguém vinculado ainda"
            descricao="Vincule a equipe de campo e o cliente para eles enxergarem esta obra."
          />
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
                  <Texto variante="auxiliar" cor={cores.textoSecundario}>
                    {ROTULO_PAPEL[membro.papel] ?? membro.papel}
                  </Texto>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={styles.secao}>
        <Texto variante="subtitulo">RDOs recentes</Texto>

        {!rdos || rdos.length === 0 ? (
          <EstadoVazio
            icone="clipboard"
            titulo="Nenhum RDO nesta obra"
            descricao="Os registros aparecem aqui assim que a equipe de campo começar a lançar."
          />
        ) : (
          <View style={styles.lista}>
            {rdos.map((rdo) => (
              <Pressable
                key={rdo.id}
                onPress={() => router.push(`/rdo/ver/${rdo.id}`)}
                accessibilityRole="button"
                accessibilityLabel={`Abrir RDO número ${rdo.numero}`}
                style={({ pressed }) => [styles.rdo, pressed && { opacity: 0.8 }]}
              >
                <View style={styles.textos}>
                  <Texto variante="corpoForte">RDO n. {rdo.numero}</Texto>
                  <Texto variante="auxiliar" cor={cores.textoSecundario}>
                    {formatarData(rdo.data)}
                  </Texto>
                </View>
                <StatusBadge status={statusVisual(rdo.status, rdo.devolucao_motivo)} />
              </Pressable>
            ))}
          </View>
        )}
      </View>
    </Tela>
  );
}

const styles = StyleSheet.create({
  cabecalho: { gap: espaco.sm, marginTop: espaco.md, marginBottom: espaco.lg },
  etiquetaInativa: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: espaco.md,
    borderRadius: raio.pill,
    backgroundColor: cores.superficieForte,
  },
  cartao: {
    gap: espaco.md,
    padding: espaco.lg,
    borderRadius: raio.md,
    backgroundColor: cores.superficie,
  },
  linha: { gap: 2 },
  linhaValor: { flexShrink: 1 },
  acoes: { gap: espaco.md, marginTop: espaco.lg },
  secao: { gap: espaco.md, marginTop: espaco.xxl },
  secaoCabecalho: { flexDirection: 'row', alignItems: 'center', gap: espaco.md },
  secaoTitulo: { flex: 1 },
  lista: { gap: espaco.sm },
  membro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.md,
    padding: espaco.md,
    borderRadius: raio.sm,
    backgroundColor: cores.superficie,
  },
  rdo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.md,
    padding: espaco.lg,
    borderRadius: raio.md,
    borderWidth: 1,
    borderColor: cores.borda,
  },
  chip: {
    width: 36,
    height: 36,
    borderRadius: raio.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: cores.fundo,
  },
  textos: { flex: 1, gap: 2 },
});
