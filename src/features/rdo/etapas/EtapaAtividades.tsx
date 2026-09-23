import { StyleSheet, View } from 'react-native';

import {
  BlocoLinha,
  Botao,
  Campo,
  CampoNumero,
  EstadoVazio,
  Interruptor,
  Seletor,
} from '@/components/ui';
import { cores, espaco, raio } from '@/theme/tokens';
import { novaLinha } from '../rascunho';
import type { LinhaAtividade } from '../tipos';
import { tirar, trocar, type PropsEtapa } from './comum';

const SITUACOES = [
  { valor: 'Não iniciada', rotulo: 'Não iniciada' },
  { valor: 'Em andamento', rotulo: 'Em andamento' },
  { valor: 'Concluída', rotulo: 'Concluída' },
  { valor: 'Paralisada', rotulo: 'Paralisada' },
] as const;

type Situacao = (typeof SITUACOES)[number]['valor'];

export function EtapaAtividades({ r, atualizar }: PropsEtapa) {
  const mudar = (id: string, parcial: Partial<LinhaAtividade>) =>
    atualizar((a) => ({ ...a, atividades: trocar(a.atividades, id, parcial) }));

  return (
    <View style={styles.base}>
      <View style={styles.semProducao}>
        <Interruptor
          rotulo="Dia sem produção"
          descricao="Use quando nenhum serviço foi executado (chuva o dia todo, feriado, paralisação)."
          valor={r.sem_producao}
          onChange={(sem_producao) => atualizar((a) => ({ ...a, sem_producao }))}
        />
        {r.sem_producao ? (
          <Campo
            rotulo="Justificativa"
            obrigatorio
            multiline
            placeholder="Explique por que não houve produção"
            value={r.sem_producao_justificativa}
            onChangeText={(sem_producao_justificativa) =>
              atualizar((a) => ({ ...a, sem_producao_justificativa }))
            }
            erro={
              r.sem_producao_justificativa.trim().length < 10
                ? 'Mínimo de 10 caracteres'
                : undefined
            }
          />
        ) : null}
      </View>

      {r.sem_producao ? null : (
        <>
          {r.atividades.length === 0 ? (
            <EstadoVazio
              icone="tool"
              titulo="Nenhuma atividade lançada"
              descricao="Registre cada serviço executado hoje, com local e quantidade."
            />
          ) : (
            r.atividades.map((at, i) => (
              <BlocoLinha
                key={at.id}
                titulo={at.servico.trim() || `Atividade ${i + 1}`}
                onRemover={() =>
                  atualizar((a) => ({ ...a, atividades: tirar(a.atividades, at.id) }))
                }
              >
                <Campo
                  rotulo="Serviço"
                  obrigatorio
                  placeholder="Alvenaria de vedação"
                  value={at.servico}
                  onChangeText={(servico) => mudar(at.id, { servico })}
                  erro={!at.servico.trim() ? 'Informe o serviço' : undefined}
                />
                <Campo
                  rotulo="Local"
                  placeholder="Bloco A — Pavimento 3"
                  value={at.local}
                  onChangeText={(local) => mudar(at.id, { local })}
                  ajuda="Onde, na obra, o serviço foi feito."
                />
                <Campo
                  rotulo="Descrição"
                  multiline
                  placeholder="Detalhes do que foi executado"
                  value={at.descricao}
                  onChangeText={(descricao) => mudar(at.id, { descricao })}
                />
                <View style={styles.linha}>
                  <CampoNumero
                    rotulo="Qtd. do dia"
                    decimal
                    valor={at.quantidade_dia}
                    onChange={(quantidade_dia) => mudar(at.id, { quantidade_dia })}
                    estilo={styles.metade}
                  />
                  <Campo
                    rotulo="Unidade"
                    placeholder="m², m³, m"
                    value={at.unidade}
                    onChangeText={(unidade) => mudar(at.id, { unidade })}
                    estilo={styles.metade}
                  />
                </View>
                <CampoNumero
                  rotulo="Avanço acumulado"
                  sufixo="%"
                  decimal
                  valor={at.percentual}
                  onChange={(percentual) => mudar(at.id, { percentual })}
                  ajuda="Quanto do serviço total já está pronto, não só o de hoje."
                  erro={
                    at.percentual !== null && (at.percentual < 0 || at.percentual > 100)
                      ? 'Entre 0 e 100'
                      : undefined
                  }
                />
                <Seletor
                  rotulo="Situação"
                  opcoes={SITUACOES}
                  valor={(at.situacao as Situacao) || null}
                  rolagem
                  onChange={(situacao) => mudar(at.id, { situacao })}
                />
              </BlocoLinha>
            ))
          )}

          <Botao
            titulo="Adicionar atividade"
            variante="secundaria"
            iconeEsquerda="plus"
            onPress={() =>
              atualizar((a) => ({ ...a, atividades: [...a.atividades, novaLinha.atividade()] }))
            }
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  base: { gap: espaco.lg },
  semProducao: {
    gap: espaco.md,
    padding: espaco.lg,
    borderRadius: raio.md,
    backgroundColor: cores.superficie,
  },
  linha: { flexDirection: 'row', gap: espaco.md },
  metade: { flex: 1 },
});
