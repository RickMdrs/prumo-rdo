import { StyleSheet, View } from 'react-native';

import { BlocoLinha, Botao, Campo, CampoNumero, EstadoVazio, Texto } from '@/components/ui';
import { cores, espaco, raio } from '@/theme/tokens';
import { novaLinha, totalHomemHora, totalTrabalhadores } from '../rascunho';
import type { LinhaMaoObra } from '../tipos';
import { tirar, trocar, type PropsEtapa } from './comum';

function formatarHoras(n: number): string {
  return n.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
}

export function EtapaMaoObra({ r, atualizar }: PropsEtapa) {
  const mudar = (id: string, parcial: Partial<LinhaMaoObra>) =>
    atualizar((a) => ({ ...a, mao_obra: trocar(a.mao_obra, id, parcial) }));

  return (
    <View style={styles.base}>
      <View style={styles.total} accessibilityRole="summary">
        <View style={styles.totalItem}>
          <Texto variante="auxiliar" cor="rgba(255,255,255,0.75)">
            Trabalhadores
          </Texto>
          <Texto variante="display" cor={cores.sobrePrimaria}>
            {totalTrabalhadores(r)}
          </Texto>
        </View>
        <View style={styles.divisor} />
        <View style={styles.totalItem}>
          <Texto variante="auxiliar" cor="rgba(255,255,255,0.75)">
            Homem-hora
          </Texto>
          <Texto variante="display" cor={cores.sobrePrimaria}>
            {formatarHoras(totalHomemHora(r))}
          </Texto>
        </View>
      </View>

      {r.mao_obra.length === 0 ? (
        <EstadoVazio
          icone="users"
          titulo="Nenhuma função lançada"
          descricao="Adicione uma linha para cada função: pedreiros, serventes, armadores…"
        />
      ) : (
        r.mao_obra.map((l, i) => (
          <BlocoLinha
            key={l.id}
            titulo={l.funcao.trim() || `Função ${i + 1}`}
            onRemover={() => atualizar((a) => ({ ...a, mao_obra: tirar(a.mao_obra, l.id) }))}
          >
            <Campo
              rotulo="Função"
              obrigatorio
              placeholder="Pedreiro"
              value={l.funcao}
              onChangeText={(funcao) => mudar(l.id, { funcao })}
              erro={!l.funcao.trim() ? 'Informe a função' : undefined}
            />
            <Campo
              rotulo="Equipe"
              placeholder="Equipe A, empreiteira X…"
              value={l.equipe}
              onChangeText={(equipe) => mudar(l.id, { equipe })}
            />
            <View style={styles.linha}>
              <CampoNumero
                rotulo="Quantidade"
                obrigatorio
                valor={l.quantidade}
                onChange={(q) => mudar(l.id, { quantidade: q ?? 0 })}
                estilo={styles.metade}
              />
              <CampoNumero
                rotulo="Horas"
                decimal
                obrigatorio
                valor={l.horas}
                onChange={(h) => mudar(l.id, { horas: h ?? 0 })}
                estilo={styles.metade}
              />
            </View>
            <Texto variante="auxiliar" cor={cores.textoSecundario}>
              {formatarHoras(l.quantidade * l.horas)} homem-hora nesta linha
            </Texto>
          </BlocoLinha>
        ))
      )}

      <Botao
        titulo="Adicionar função"
        variante="secundaria"
        iconeEsquerda="plus"
        onPress={() => atualizar((a) => ({ ...a, mao_obra: [...a.mao_obra, novaLinha.maoObra()] }))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  base: { gap: espaco.lg },
  total: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: espaco.xl,
    borderRadius: raio.lg,
    backgroundColor: cores.primaria,
  },
  totalItem: { flex: 1, gap: 2 },
  divisor: {
    width: 1,
    alignSelf: 'stretch',
    marginHorizontal: espaco.lg,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  linha: { flexDirection: 'row', gap: espaco.md },
  metade: { flex: 1 },
});
