import { Feather } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Botao, Texto } from '@/components/ui';
import { buscarAuditoria, type LinhaAuditoria } from '@/features/rdo/detalhe';
import { formatarDataHora } from '@/lib/datas';
import { cores, espaco, raio } from '@/theme/tokens';

const ACAO: Record<string, { rotulo: string; icone: keyof typeof Feather.glyphMap }> = {
  INSERT: { rotulo: 'incluiu', icone: 'plus-circle' },
  UPDATE: { rotulo: 'alterou', icone: 'edit-2' },
  DELETE: { rotulo: 'removeu', icone: 'minus-circle' },
};

const TABELA: Record<string, string> = {
  rdos: 'RDO',
  rdo_clima: 'clima',
  rdo_mao_obra: 'mão de obra',
  rdo_equipamentos: 'equipamento',
  rdo_atividades: 'atividade',
  rdo_ocorrencias: 'ocorrência',
  rdo_pendencias: 'pendência',
  rdo_fotos: 'foto',
  comentarios: 'comentário',
  assinaturas: 'assinatura',
};

const IGNORAR = new Set(['updated_at', 'created_at']);

function camposAlterados(l: LinhaAuditoria): string[] {
  if (l.acao !== 'UPDATE' || !l.antes || !l.depois) return [];
  return Object.keys(l.depois).filter(
    (k) => !IGNORAR.has(k) && JSON.stringify(l.antes?.[k]) !== JSON.stringify(l.depois?.[k]),
  );
}

function descreverMudanca(l: LinhaAuditoria, campo: string): string {
  const antes = l.antes?.[campo];
  const depois = l.depois?.[campo];
  if (campo === 'status') return `situação: ${String(antes)} → ${String(depois)}`;
  return campo.replace(/_/g, ' ');
}

/** Rastro imutável do RDO, lido de `auditoria`. Só o Master tem acesso. */
export function HistoricoAuditoria({ rdoId }: { rdoId: string }) {
  const [aberto, setAberto] = useState(false);

  const consulta = useQuery({
    queryKey: ['auditoria', rdoId],
    queryFn: () => buscarAuditoria(rdoId),
    enabled: aberto,
  });

  return (
    <View style={styles.base}>
      <Texto variante="subtitulo">Auditoria</Texto>
      <Texto variante="auxiliar" cor={cores.textoSecundario}>
        Registrada pelo banco a cada inclusão, alteração ou remoção. Ninguém consegue editar nem
        apagar estas linhas.
      </Texto>

      {!aberto ? (
        <Botao
          titulo="Ver histórico de auditoria"
          variante="secundaria"
          iconeEsquerda="list"
          onPress={() => setAberto(true)}
        />
      ) : consulta.isPending ? (
        <Texto variante="auxiliar" cor={cores.textoSecundario}>
          Carregando…
        </Texto>
      ) : consulta.error ? (
        <Texto variante="auxiliar" cor={cores.erro}>
          {consulta.error.message}
        </Texto>
      ) : (
        <View style={styles.lista}>
          <Texto variante="rotulo" cor={cores.textoSecundario}>
            {consulta.data.length} REGISTRO(S)
          </Texto>
          {consulta.data.map((l) => {
            const acao = ACAO[l.acao] ?? { rotulo: l.acao, icone: 'circle' as const };
            const campos = camposAlterados(l);
            return (
              <View key={l.id} style={styles.item}>
                <Feather name={acao.icone} size={16} color={cores.primaria} style={styles.icone} />
                <View style={styles.flex}>
                  <Texto variante="auxiliar">
                    <Texto variante="auxiliar" style={styles.forte}>
                      {l.ator}
                    </Texto>{' '}
                    {acao.rotulo} {TABELA[l.tabela] ?? l.tabela}
                  </Texto>
                  {campos.length > 0 ? (
                    <Texto variante="auxiliar" cor={cores.textoSecundario}>
                      {campos.map((c) => descreverMudanca(l, c)).join(' · ')}
                    </Texto>
                  ) : null}
                  <Texto variante="auxiliar" cor={cores.textoDesabilitado}>
                    #{l.id} · {formatarDataHora(l.quando)}
                  </Texto>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  base: { gap: espaco.sm, marginTop: espaco.md },
  lista: { gap: espaco.xs },
  item: {
    flexDirection: 'row',
    gap: espaco.sm,
    padding: espaco.sm,
    borderRadius: raio.sm,
    backgroundColor: cores.superficie,
  },
  icone: { marginTop: 2 },
  flex: { flex: 1, gap: 1 },
  forte: { fontWeight: '700' },
});
