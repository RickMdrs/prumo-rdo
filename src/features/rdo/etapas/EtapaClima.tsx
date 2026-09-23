import { StyleSheet, View } from 'react-native';

import { Campo, CampoNumero, Interruptor, Seletor, Texto } from '@/components/ui';
import { cores, espaco, raio } from '@/theme/tokens';
import { novaLinha } from '../rascunho';
import type { ClimaPeriodo, CondicaoTempo, Periodo } from '../tipos';
import { trocar, type PropsEtapa } from './comum';

const PERIODOS: { valor: Periodo; rotulo: string }[] = [
  { valor: 'manha', rotulo: 'Manhã' },
  { valor: 'tarde', rotulo: 'Tarde' },
  { valor: 'noite', rotulo: 'Noite' },
];

const CONDICOES: { valor: CondicaoTempo; rotulo: string }[] = [
  { valor: 'sol', rotulo: 'Sol' },
  { valor: 'nublado', rotulo: 'Nublado' },
  { valor: 'chuva_fraca', rotulo: 'Chuva fraca' },
  { valor: 'chuva_forte', rotulo: 'Chuva forte' },
  { valor: 'impraticavel', rotulo: 'Impraticável' },
];

export function EtapaClima({ r, atualizar }: PropsEtapa) {
  const mudar = (id: string, parcial: Partial<ClimaPeriodo>) =>
    atualizar((a) => ({ ...a, clima: trocar(a.clima, id, parcial) }));

  return (
    <View style={styles.base}>
      <Texto variante="corpo" cor={cores.textoSecundario}>
        Marque os períodos em que houve trabalho. Pelo menos um é obrigatório para submeter.
      </Texto>

      {PERIODOS.map(({ valor: periodo, rotulo }) => {
        const c = r.clima.find((x) => x.periodo === periodo);

        return (
          <View key={periodo} style={[styles.periodo, c && styles.periodoAtivo]}>
            <Interruptor
              rotulo={rotulo}
              descricao={c ? undefined : 'Sem registro neste período'}
              valor={Boolean(c)}
              onChange={(ligado) =>
                atualizar((a) => ({
                  ...a,
                  clima: ligado
                    ? [...a.clima, novaLinha.clima(periodo)].sort(
                        (x, y) =>
                          PERIODOS.findIndex((p) => p.valor === x.periodo) -
                          PERIODOS.findIndex((p) => p.valor === y.periodo),
                      )
                    : a.clima.filter((x) => x.periodo !== periodo),
                }))
              }
            />

            {c ? (
              <View style={styles.campos}>
                <Seletor
                  rotulo="Condição do tempo"
                  opcoes={CONDICOES}
                  valor={c.condicao}
                  rolagem
                  onChange={(condicao) =>
                    mudar(c.id, {
                      condicao,
                      // Marcar chuva na condição já liga o "choveu".
                      choveu: condicao.startsWith('chuva') ? true : c.choveu,
                    })
                  }
                />

                <CampoNumero
                  rotulo="Temperatura"
                  sufixo="°C"
                  decimal
                  valor={c.temperatura_c}
                  onChange={(temperatura_c) => mudar(c.id, { temperatura_c })}
                />

                <Interruptor
                  rotulo="Choveu neste período?"
                  valor={c.choveu}
                  onChange={(choveu) => mudar(c.id, { choveu })}
                />

                {c.choveu ? (
                  <>
                    <CampoNumero
                      rotulo="Duração da chuva"
                      sufixo="minutos"
                      obrigatorio
                      valor={c.chuva_duracao_min}
                      onChange={(chuva_duracao_min) => mudar(c.id, { chuva_duracao_min })}
                      erro={
                        !(c.chuva_duracao_min && c.chuva_duracao_min > 0)
                          ? 'Obrigatório quando chove'
                          : undefined
                      }
                    />
                    <Campo
                      rotulo="Impacto da chuva na obra"
                      obrigatorio
                      multiline
                      placeholder="Ex.: concretagem interrompida, equipe remanejada para área coberta"
                      value={c.chuva_impacto}
                      onChangeText={(chuva_impacto) => mudar(c.id, { chuva_impacto })}
                      erro={!c.chuva_impacto.trim() ? 'Obrigatório quando chove' : undefined}
                    />
                    <CampoNumero
                      rotulo="Precipitação"
                      sufixo="mm"
                      decimal
                      valor={c.precipitacao_mm}
                      onChange={(precipitacao_mm) => mudar(c.id, { precipitacao_mm })}
                      ajuda="Opcional. Só se houver pluviômetro na obra."
                    />
                  </>
                ) : null}

                <CampoNumero
                  rotulo="Horas paralisadas pelo clima"
                  decimal
                  valor={c.horas_paralisadas}
                  onChange={(horas_paralisadas) => mudar(c.id, { horas_paralisadas })}
                  ajuda="Tempo em que a frente de serviço ficou parada por causa do tempo."
                />
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  base: { gap: espaco.lg },
  periodo: {
    gap: espaco.md,
    padding: espaco.lg,
    borderRadius: raio.md,
    backgroundColor: cores.superficie,
  },
  periodoAtivo: { backgroundColor: cores.fundo, borderWidth: 1, borderColor: cores.borda },
  campos: { gap: espaco.lg },
});
