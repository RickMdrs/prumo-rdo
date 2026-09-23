import { StyleSheet, View } from 'react-native';

import { BlocoLinha, Botao, Campo, CampoData, Seletor, Texto } from '@/components/ui';
import { cores, espaco } from '@/theme/tokens';
import { novaLinha } from '../rascunho';
import type { LinhaOcorrencia, LinhaPendencia } from '../tipos';
import { tirar, trocar, type PropsEtapa } from './comum';

const CRITICIDADES = [
  { valor: 'Baixa', rotulo: 'Baixa' },
  { valor: 'Média', rotulo: 'Média' },
  { valor: 'Alta', rotulo: 'Alta' },
] as const;

type Criticidade = (typeof CRITICIDADES)[number]['valor'];

function mascaraHora(entrada: string): string {
  const d = entrada.replace(/\D/g, '').slice(0, 4);
  return d.length <= 2 ? d : `${d.slice(0, 2)}:${d.slice(2)}`;
}

export function EtapaOcorrencias({ r, atualizar }: PropsEtapa) {
  const mudarOc = (id: string, parcial: Partial<LinhaOcorrencia>) =>
    atualizar((a) => ({ ...a, ocorrencias: trocar(a.ocorrencias, id, parcial) }));
  const mudarPd = (id: string, parcial: Partial<LinhaPendencia>) =>
    atualizar((a) => ({ ...a, pendencias: trocar(a.pendencias, id, parcial) }));

  return (
    <View style={styles.base}>
      <Texto variante="corpo" cor={cores.textoSecundario}>
        As duas seções são opcionais. Registre só o que fugiu da rotina.
      </Texto>

      <View style={styles.secao}>
        <Texto variante="subtitulo">Ocorrências</Texto>
        <Texto variante="auxiliar" cor={cores.textoSecundario}>
          Acidente, interferência, falta de material, visita da fiscalização…
        </Texto>

        {r.ocorrencias.map((o, i) => (
          <BlocoLinha
            key={o.id}
            titulo={`Ocorrência ${i + 1}`}
            onRemover={() => atualizar((a) => ({ ...a, ocorrencias: tirar(a.ocorrencias, o.id) }))}
          >
            <Campo
              rotulo="O que aconteceu"
              obrigatorio
              multiline
              value={o.descricao}
              onChangeText={(descricao) => mudarOc(o.id, { descricao })}
              erro={!o.descricao.trim() ? 'Descreva a ocorrência' : undefined}
            />
            <Campo
              rotulo="Horário"
              placeholder="14:30"
              keyboardType="number-pad"
              maxLength={5}
              value={o.horario}
              onChangeText={(h) => mudarOc(o.id, { horario: mascaraHora(h) })}
            />
            <Campo
              rotulo="Impacto"
              multiline
              value={o.impacto}
              onChangeText={(impacto) => mudarOc(o.id, { impacto })}
            />
            <Campo
              rotulo="Ação imediata"
              multiline
              value={o.acao_imediata}
              onChangeText={(acao_imediata) => mudarOc(o.id, { acao_imediata })}
            />
            <Campo
              rotulo="Responsável"
              value={o.responsavel}
              onChangeText={(responsavel) => mudarOc(o.id, { responsavel })}
            />
          </BlocoLinha>
        ))}

        <Botao
          titulo="Adicionar ocorrência"
          variante="secundaria"
          iconeEsquerda="alert-triangle"
          onPress={() =>
            atualizar((a) => ({ ...a, ocorrencias: [...a.ocorrencias, novaLinha.ocorrencia()] }))
          }
        />
      </View>

      <View style={styles.secao}>
        <Texto variante="subtitulo">Pendências</Texto>
        <Texto variante="auxiliar" cor={cores.textoSecundario}>
          O que precisa ser resolvido por alguém, com prazo.
        </Texto>

        {r.pendencias.map((p, i) => (
          <BlocoLinha
            key={p.id}
            titulo={`Pendência ${i + 1}`}
            onRemover={() => atualizar((a) => ({ ...a, pendencias: tirar(a.pendencias, p.id) }))}
          >
            <Campo
              rotulo="Descrição"
              obrigatorio
              multiline
              value={p.descricao}
              onChangeText={(descricao) => mudarPd(p.id, { descricao })}
              erro={!p.descricao.trim() ? 'Descreva a pendência' : undefined}
            />
            <Campo
              rotulo="Responsável"
              value={p.responsavel}
              onChangeText={(responsavel) => mudarPd(p.id, { responsavel })}
            />
            <CampoData
              rotulo="Prazo"
              valor={p.prazo}
              onChange={(prazo) => mudarPd(p.id, { prazo })}
            />
            <Seletor
              rotulo="Criticidade"
              opcoes={CRITICIDADES}
              valor={(p.criticidade as Criticidade) || null}
              onChange={(criticidade) => mudarPd(p.id, { criticidade })}
            />
          </BlocoLinha>
        ))}

        <Botao
          titulo="Adicionar pendência"
          variante="secundaria"
          iconeEsquerda="flag"
          onPress={() =>
            atualizar((a) => ({ ...a, pendencias: [...a.pendencias, novaLinha.pendencia()] }))
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  base: { gap: espaco.xl },
  secao: { gap: espaco.md },
});
