import { Feather } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Pressable, StyleSheet, View } from 'react-native';

import { Texto } from '@/components/ui';
import type { FiltroCaixa } from '@/features/fluxo/caixa';
import { formatarData } from '@/lib/datas';
import { traduzirErro } from '@/lib/erros';
import { supabase } from '@/lib/supabase';
import { cores, espaco, icone, raio } from '@/theme/tokens';

type DadosPainel = {
  contadores: {
    para_analisar: number;
    devolvidos: number;
    aguardando_cliente: number;
    finalizados: number;
  };
  atrasados: { obra_id: string; obra: string; dias: number; ultimos: string[] }[];
  hh_semana: { obra_id: string; obra: string; hh: number }[];
  semana_inicio: string;
};

async function buscarPainel(): Promise<DadosPainel> {
  const { data, error } = await supabase.rpc('painel_master');
  if (error) throw new Error(traduzirErro(error));
  return data as unknown as DadosPainel;
}

export function usePainel() {
  return useQuery({ queryKey: ['painel'], queryFn: buscarPainel });
}

type Props = {
  dados: DadosPainel | undefined;
  filtroAtivo: FiltroCaixa;
  aoFiltrar: (filtro: FiltroCaixa) => void;
};

const CONTADORES: {
  chave: keyof DadosPainel['contadores'];
  filtro: FiltroCaixa;
  rotulo: string;
  icone: keyof typeof Feather.glyphMap;
  destaque?: boolean;
}[] = [
  {
    chave: 'para_analisar',
    filtro: 'pendentes',
    rotulo: 'Para analisar',
    icone: 'inbox',
    destaque: true,
  },
  { chave: 'devolvidos', filtro: 'devolvidos', rotulo: 'Devolvidos', icone: 'corner-up-left' },
  { chave: 'aguardando_cliente', filtro: 'cliente', rotulo: 'Aguardando cliente', icone: 'clock' },
  { chave: 'finalizados', filtro: 'finalizados', rotulo: 'Finalizados', icone: 'award' },
];

export function Painel({ dados, filtroAtivo, aoFiltrar }: Props) {
  const maxHh = Math.max(1, ...(dados?.hh_semana ?? []).map((h) => Number(h.hh)));

  return (
    <View style={styles.base}>
      <View style={styles.grade}>
        {CONTADORES.map((c) => {
          const ativo = filtroAtivo === c.filtro;
          const solido = c.destaque;
          return (
            <Pressable
              key={c.chave}
              onPress={() => aoFiltrar(c.filtro)}
              accessibilityRole="button"
              accessibilityState={{ selected: ativo }}
              accessibilityLabel={`${c.rotulo}: ${dados?.contadores[c.chave] ?? 0}. Toque para filtrar.`}
              style={[
                styles.contador,
                solido ? styles.contadorSolido : styles.contadorClaro,
                ativo && !solido && styles.contadorAtivo,
              ]}
            >
              <View style={[styles.chip, solido && styles.chipSolido]}>
                <Feather
                  name={c.icone}
                  size={icone.sm}
                  color={solido ? cores.sobrePrimaria : cores.primaria}
                />
              </View>
              <Texto variante="display" cor={solido ? cores.sobrePrimaria : cores.texto}>
                {dados?.contadores[c.chave] ?? '–'}
              </Texto>
              <Texto
                variante="auxiliar"
                cor={solido ? 'rgba(255,255,255,0.8)' : cores.textoSecundario}
                numberOfLines={1}
              >
                {c.rotulo}
              </Texto>
            </Pressable>
          );
        })}
      </View>

      {dados && dados.atrasados.length > 0 ? (
        <View style={styles.bloco}>
          <View style={styles.linha}>
            <Feather name="alert-triangle" size={icone.sm} color={cores.aviso} />
            <Texto variante="corpoForte" style={styles.flex}>
              RDOs atrasados
            </Texto>
          </View>
          <Texto variante="auxiliar" cor={cores.textoSecundario}>
            Dias úteis dos últimos 14 dias sem nenhum RDO na obra.
          </Texto>
          {dados.atrasados.map((a) => (
            <View key={a.obra_id} style={styles.atrasado}>
              <View style={styles.flex}>
                <Texto variante="corpoForte" numberOfLines={1}>
                  {a.obra}
                </Texto>
                <Texto variante="auxiliar" cor={cores.textoSecundario} numberOfLines={1}>
                  Último(s): {a.ultimos.map(formatarData).join(', ')}
                </Texto>
              </View>
              <View style={styles.dias}>
                <Texto variante="corpoForte" cor={cores.aviso}>
                  {a.dias}
                </Texto>
                <Texto variante="rotulo" cor={cores.aviso}>
                  {a.dias === 1 ? 'DIA' : 'DIAS'}
                </Texto>
              </View>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.bloco}>
        <Texto variante="corpoForte">Homem-hora da semana</Texto>
        <Texto variante="auxiliar" cor={cores.textoSecundario}>
          Desde {formatarData(dados?.semana_inicio ?? null)}, por obra.
        </Texto>
        {(dados?.hh_semana ?? []).length === 0 ? (
          <Texto variante="auxiliar" cor={cores.textoDesabilitado}>
            Nenhuma mão de obra lançada nesta semana.
          </Texto>
        ) : (
          dados?.hh_semana.map((h) => (
            <View key={h.obra_id} style={styles.hh}>
              <View style={styles.linha}>
                <Texto variante="auxiliar" style={styles.flex} numberOfLines={1}>
                  {h.obra}
                </Texto>
                <Texto variante="corpoForte">{Number(h.hh).toLocaleString('pt-BR')} HH</Texto>
              </View>
              <View style={styles.barraFundo}>
                <View
                  style={[styles.barra, { width: `${(Number(h.hh) / maxHh) * 100}%` }]}
                  accessibilityElementsHidden
                />
              </View>
            </View>
          ))
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  base: { gap: espaco.lg },
  flex: { flex: 1 },
  grade: { flexDirection: 'row', flexWrap: 'wrap', gap: espaco.md },
  contador: {
    flexGrow: 1,
    flexBasis: '45%',
    gap: 2,
    padding: espaco.lg,
    borderRadius: raio.md,
  },
  contadorSolido: { backgroundColor: cores.primaria, borderRadius: raio.lg },
  contadorClaro: {
    backgroundColor: cores.superficie,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  contadorAtivo: { borderColor: cores.primaria, backgroundColor: cores.fundo },
  chip: {
    width: 32,
    height: 32,
    marginBottom: espaco.xs,
    borderRadius: raio.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: cores.fundo,
  },
  chipSolido: { backgroundColor: 'rgba(255,255,255,0.14)' },
  bloco: {
    gap: espaco.sm,
    padding: espaco.lg,
    borderRadius: raio.md,
    backgroundColor: cores.superficie,
  },
  linha: { flexDirection: 'row', alignItems: 'center', gap: espaco.sm },
  atrasado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.md,
    padding: espaco.md,
    borderRadius: raio.sm,
    backgroundColor: cores.fundo,
  },
  dias: { alignItems: 'center', minWidth: 44 },
  hh: { gap: 4 },
  barraFundo: { height: 8, borderRadius: raio.pill, backgroundColor: cores.superficieForte },
  barra: { height: 8, borderRadius: raio.pill, backgroundColor: cores.primaria },
});
