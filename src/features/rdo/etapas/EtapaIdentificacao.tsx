import { Feather } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { Botao, CampoData, Seletor, Texto } from '@/components/ui';
import { useAuth } from '@/features/auth/useAuth';
import { cores, espaco, icone, raio } from '@/theme/tokens';
import { existeDuplicado, importarDoAnterior, obrasDisponiveis } from '../remoto';
import type { Turno } from '../tipos';
import type { PropsEtapa } from './comum';

const TURNOS: { valor: Turno; rotulo: string }[] = [
  { valor: 'manha', rotulo: 'Manhã' },
  { valor: 'tarde', rotulo: 'Tarde' },
  { valor: 'noite', rotulo: 'Noite' },
  { valor: 'integral', rotulo: 'Integral' },
];

export function EtapaIdentificacao({ r, atualizar }: PropsEtapa) {
  const { sessao } = useAuth();
  const autorId = sessao?.user.id ?? '';
  const [importando, setImportando] = useState(false);

  const { data: obras } = useQuery({
    queryKey: ['obras-disponiveis', autorId],
    queryFn: () => obrasDisponiveis(autorId),
    enabled: Boolean(autorId),
  });

  const { data: duplicado } = useQuery({
    queryKey: ['duplicado', r.obra_id, r.data, r.turno, r.id],
    queryFn: () => existeDuplicado(autorId, r.obra_id, r.data, r.turno, r.id),
    enabled: Boolean(autorId && r.obra_id && r.data),
  });

  // Depois que o RDO ganha número, ele pertence àquela obra para sempre.
  const obraTravada = r.numero !== null;

  async function importar() {
    setImportando(true);
    try {
      const anterior = await importarDoAnterior(autorId, r.obra_id, r.id);
      if (!anterior) {
        Alert.alert('Nada para importar', 'Esta obra ainda não tem RDO anterior.');
        return;
      }

      const aplicar = () =>
        atualizar((atual) => ({
          ...atual,
          mao_obra: anterior.mao_obra,
          equipamentos: anterior.equipamentos,
          atividades: anterior.atividades,
        }));

      const jaTemDados = r.mao_obra.length + r.equipamentos.length + r.atividades.length > 0;

      if (jaTemDados) {
        Alert.alert(
          'Substituir o que já foi lançado?',
          'Mão de obra, equipamentos e atividades deste RDO serão trocados pelos do RDO anterior.',
          [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Substituir', style: 'destructive', onPress: aplicar },
          ],
        );
      } else {
        aplicar();
      }
    } catch (erro) {
      Alert.alert('Não foi possível importar', erro instanceof Error ? erro.message : '');
    } finally {
      setImportando(false);
    }
  }

  return (
    <View style={styles.base}>
      <View style={styles.bloco}>
        <Texto variante="auxiliar" cor={cores.textoSecundario}>
          Obra
        </Texto>

        {obraTravada ? (
          <View style={[styles.obra, styles.obraAtiva]}>
            <Feather name="lock" size={icone.sm} color={cores.primaria} />
            <Texto variante="corpoForte" style={styles.flex}>
              {r.obra_nome}
            </Texto>
          </View>
        ) : (
          (obras ?? []).map((obra) => {
            const ativa = obra.id === r.obra_id;
            return (
              <Pressable
                key={obra.id}
                onPress={() =>
                  atualizar((atual) => ({ ...atual, obra_id: obra.id, obra_nome: obra.nome }))
                }
                accessibilityRole="radio"
                accessibilityState={{ selected: ativa }}
                accessibilityLabel={obra.nome}
                style={[styles.obra, ativa && styles.obraAtiva]}
              >
                <Feather
                  name={ativa ? 'check-circle' : 'circle'}
                  size={icone.md}
                  color={ativa ? cores.primaria : cores.textoDesabilitado}
                />
                <Texto variante={ativa ? 'corpoForte' : 'corpo'} style={styles.flex}>
                  {obra.nome}
                </Texto>
              </Pressable>
            );
          })
        )}
        {obraTravada ? (
          <Texto variante="auxiliar" cor={cores.textoDesabilitado}>
            O RDO já tem número nesta obra e não pode trocar de obra.
          </Texto>
        ) : null}
      </View>

      <CampoData
        rotulo="Data"
        valor={r.data}
        onChange={(data) => data && atualizar((atual) => ({ ...atual, data }))}
        ajuda="O RDO é do dia em que os fatos aconteceram. Data futura não é aceita."
        obrigatorio
      />

      <Seletor
        rotulo="Turno"
        opcoes={TURNOS}
        valor={r.turno}
        onChange={(turno) => atualizar((atual) => ({ ...atual, turno }))}
      />

      {duplicado ? (
        <View style={styles.aviso} accessibilityLiveRegion="polite">
          <Feather name="alert-triangle" size={icone.md} color={cores.aviso} />
          <Texto variante="auxiliar" cor={cores.aviso} style={styles.flex}>
            Já existe um RDO desta obra para esta data e turno. Confira se não está lançando em
            duplicidade.
          </Texto>
        </View>
      ) : null}

      <View style={styles.importar}>
        <Texto variante="corpoForte">Começar do RDO anterior</Texto>
        <Texto variante="auxiliar" cor={cores.textoSecundario}>
          Copia a mão de obra, os equipamentos e os locais de serviço do último RDO desta obra.
          Quantidades do dia ficam em branco.
        </Texto>
        <Botao
          titulo="Importar do RDO anterior"
          variante="secundaria"
          iconeEsquerda="copy"
          carregando={importando}
          desabilitado={!r.obra_id}
          onPress={() => void importar()}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  base: { gap: espaco.xl },
  bloco: { gap: espaco.sm },
  obra: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.md,
    minHeight: 52,
    paddingHorizontal: espaco.lg,
    borderRadius: raio.sm,
    borderWidth: 1,
    borderColor: cores.borda,
    backgroundColor: cores.superficie,
  },
  obraAtiva: { borderColor: cores.primaria, backgroundColor: cores.fundo },
  flex: { flex: 1 },
  aviso: {
    flexDirection: 'row',
    gap: espaco.sm,
    padding: espaco.md,
    borderRadius: raio.sm,
    backgroundColor: '#FDF3E3',
  },
  importar: {
    gap: espaco.sm,
    padding: espaco.lg,
    borderRadius: raio.md,
    backgroundColor: cores.superficie,
  },
});
