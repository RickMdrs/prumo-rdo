import { StyleSheet, View } from 'react-native';

import { BlocoLinha, Botao, Campo, CampoNumero, EstadoVazio } from '@/components/ui';
import { espaco } from '@/theme/tokens';
import { novaLinha } from '../rascunho';
import type { LinhaEquipamento } from '../tipos';
import { tirar, trocar, type PropsEtapa } from './comum';

export function EtapaEquipamentos({ r, atualizar }: PropsEtapa) {
  const mudar = (id: string, parcial: Partial<LinhaEquipamento>) =>
    atualizar((a) => ({ ...a, equipamentos: trocar(a.equipamentos, id, parcial) }));

  return (
    <View style={styles.base}>
      {r.equipamentos.length === 0 ? (
        <EstadoVazio
          icone="truck"
          titulo="Nenhum equipamento lançado"
          descricao="Registre máquinas e ferramentas relevantes. Se algum ficou parado, o motivo é obrigatório."
        />
      ) : (
        r.equipamentos.map((e, i) => (
          <BlocoLinha
            key={e.id}
            titulo={
              [e.tipo.trim(), e.identificacao.trim()].filter(Boolean).join(' · ') ||
              `Equipamento ${i + 1}`
            }
            onRemover={() =>
              atualizar((a) => ({ ...a, equipamentos: tirar(a.equipamentos, e.id) }))
            }
          >
            <Campo
              rotulo="Tipo"
              obrigatorio
              placeholder="Betoneira, retroescavadeira…"
              value={e.tipo}
              onChangeText={(tipo) => mudar(e.id, { tipo })}
              erro={!e.tipo.trim() ? 'Informe o tipo' : undefined}
            />
            <View style={styles.linha}>
              <Campo
                rotulo="Identificação"
                placeholder="BET-02"
                autoCapitalize="characters"
                value={e.identificacao}
                onChangeText={(identificacao) => mudar(e.id, { identificacao })}
                estilo={styles.metade}
              />
              <CampoNumero
                rotulo="Quantidade"
                valor={e.quantidade}
                onChange={(q) => mudar(e.id, { quantidade: q ?? 0 })}
                estilo={styles.metade}
              />
            </View>
            <View style={styles.linha}>
              <CampoNumero
                rotulo="Horas produtivas"
                decimal
                valor={e.horas_produtivas}
                onChange={(h) => mudar(e.id, { horas_produtivas: h ?? 0 })}
                estilo={styles.metade}
              />
              <CampoNumero
                rotulo="Horas paradas"
                decimal
                valor={e.horas_paradas}
                onChange={(h) => mudar(e.id, { horas_paradas: h ?? 0 })}
                estilo={styles.metade}
              />
            </View>
            {e.horas_paradas > 0 ? (
              <Campo
                rotulo="Motivo da parada"
                obrigatorio
                multiline
                placeholder="Manutenção, falta de operador, chuva…"
                value={e.motivo_parada}
                onChangeText={(motivo_parada) => mudar(e.id, { motivo_parada })}
                erro={!e.motivo_parada.trim() ? 'Obrigatório quando há horas paradas' : undefined}
              />
            ) : null}
            <Campo
              rotulo="Operador"
              placeholder="Nome do operador"
              value={e.operador}
              onChangeText={(operador) => mudar(e.id, { operador })}
            />
          </BlocoLinha>
        ))
      )}

      <Botao
        titulo="Adicionar equipamento"
        variante="secundaria"
        iconeEsquerda="plus"
        onPress={() =>
          atualizar((a) => ({ ...a, equipamentos: [...a.equipamentos, novaLinha.equipamento()] }))
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  base: { gap: espaco.lg },
  linha: { flexDirection: 'row', gap: espaco.md },
  metade: { flex: 1 },
});
