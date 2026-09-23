import { Feather } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Botao, Campo, Carregando, EstadoVazio, StatusBadge, Texto } from '@/components/ui';
import { useAuth } from '@/features/auth/useAuth';
import { acoes } from '@/features/fluxo/acoes';
import {
  DECLARACAO_CLIENTE,
  DECLARACAO_CLIENTE_COM_RESSALVA,
  DECLARACAO_MASTER,
} from '@/features/fluxo/declaracoes';
import { montarLinhaDoTempo, type Evento } from '@/features/fluxo/linhaDoTempo';
import { ModalAcao, type ConfigAcao } from '@/features/fluxo/ModalAcao';
import { buscarRdoCompleto } from '@/features/rdo/detalhe';
import { HistoricoAuditoria } from '@/features/painel/HistoricoAuditoria';
import { SecaoPdf } from '@/features/pdf/SecaoPdf';
import { baixarRdoParaEdicao } from '@/features/rdo/remoto';
import { formatarData, formatarDataHora } from '@/lib/datas';
import { statusVisual } from '@/theme/status';
import { cores, espaco, icone, raio } from '@/theme/tokens';

const TURNO = { manha: 'Manhã', tarde: 'Tarde', noite: 'Noite', integral: 'Integral' } as const;
const PERIODO: Record<string, string> = { manha: 'Manhã', tarde: 'Tarde', noite: 'Noite' };
const CONDICAO = {
  sol: 'Sol',
  nublado: 'Nublado',
  chuva_fraca: 'Chuva fraca',
  chuva_forte: 'Chuva forte',
  impraticavel: 'Impraticável',
} as const;

const COR_EVENTO: Record<Evento['cor'], string> = {
  primaria: cores.primaria,
  sucesso: cores.sucesso,
  aviso: cores.aviso,
  erro: cores.erro,
  neutra: cores.textoSecundario,
};

type Alvo = {
  tipo: 'rdo' | 'atividade' | 'ocorrencia' | 'foto';
  id: string | null;
  rotulo: string;
};

function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <View style={styles.secao}>
      <Texto variante="subtitulo">{titulo}</Texto>
      {children}
    </View>
  );
}

function Nada({ texto }: { texto: string }) {
  return (
    <Texto variante="auxiliar" cor={cores.textoDesabilitado}>
      {texto}
    </Texto>
  );
}

export default function DetalheRdo() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const cliente = useQueryClient();
  const { perfil, sessao } = useAuth();
  const rolagem = useRef<ScrollView>(null);

  const [acao, setAcao] = useState<ConfigAcao | null>(null);
  const [alvo, setAlvo] = useState<Alvo>({ tipo: 'rdo', id: null, rotulo: 'RDO inteiro' });
  const [comentario, setComentario] = useState('');
  const [enviandoComentario, setEnviandoComentario] = useState(false);
  const [posicaoComentarios, setPosicaoComentarios] = useState(0);

  const {
    data: d,
    isPending,
    error,
    refetch,
  } = useQuery({
    queryKey: ['rdo-completo', id],
    queryFn: () => buscarRdoCompleto(id),
  });

  const papel = perfil?.papel;
  const status = d?.rdo.status;

  // Regra da Parte 8: o Master abrir um RDO submetido já o coloca em análise.
  useEffect(() => {
    if (papel === 'master' && status === 'submetido') {
      void acoes
        .iniciarAnalise(id)
        .then(() => cliente.invalidateQueries({ queryKey: ['rdo-completo', id] }));
    }
  }, [papel, status, id, cliente]);

  if (isPending) return <Carregando mensagem="Carregando o RDO" />;

  if (error || !d) {
    return (
      <View style={[styles.vazio, { paddingTop: insets.top }]}>
        <EstadoVazio
          icone="eye-off"
          titulo="RDO indisponível"
          descricao={error?.message ?? 'Você não tem acesso a este RDO.'}
        />
        <Botao titulo="Voltar" variante="secundaria" onPress={() => router.back()} />
      </View>
    );
  }

  const atualizarTudo = async () => {
    await Promise.all([
      refetch(),
      cliente.invalidateQueries({ queryKey: ['caixa'] }),
      cliente.invalidateQueries({ queryKey: ['meus-rdos'] }),
    ]);
  };

  const bloqueado = d.rdo.status !== 'rascunho';
  const homemHora = d.maoObra.reduce((s, l) => s + l.quantidade * Number(l.horas), 0);
  const trabalhadores = d.maoObra.reduce((s, l) => s + l.quantidade, 0);
  const eventos = montarLinhaDoTempo(d);

  const podeAnalisar = papel === 'master' && ['submetido', 'em_analise'].includes(d.rdo.status);
  const podeDarCiencia = papel === 'cliente' && d.rdo.status === 'enviado_cliente';
  const podeEncerrar = papel === 'master' && d.rdo.status === 'finalizado';
  const podeCancelar =
    papel === 'master' && !['cancelado', 'retificado', 'finalizado'].includes(d.rdo.status);
  const podeEditar = d.rdo.status === 'rascunho' && d.rdo.autor_id === sessao?.user.id;

  async function editar() {
    if (!sessao) return;
    try {
      await baixarRdoParaEdicao(id, sessao.user.id);
      router.push(`/rdo/${id}`);
    } catch (e) {
      Alert.alert('Não foi possível abrir para edição', e instanceof Error ? e.message : '');
    }
  }

  function comentarSobre(novo: Alvo) {
    setAlvo(novo);
    rolagem.current?.scrollTo({ y: posicaoComentarios, animated: true });
  }

  async function enviarComentario() {
    if (!sessao || comentario.trim().length === 0) return;
    setEnviandoComentario(true);
    try {
      await acoes.comentar(id, sessao.user.id, comentario, { tipo: alvo.tipo, id: alvo.id });
      setComentario('');
      setAlvo({ tipo: 'rdo', id: null, rotulo: 'RDO inteiro' });
      await refetch();
    } catch (e) {
      Alert.alert('Comentário não enviado', e instanceof Error ? e.message : '');
    } finally {
      setEnviandoComentario(false);
    }
  }

  function rotuloAlvo(tipo: string, alvoId: string | null): string | null {
    if (!alvoId) return null;
    if (tipo === 'atividade')
      return `Atividade: ${d!.atividades.find((a) => a.id === alvoId)?.servico ?? '—'}`;
    if (tipo === 'ocorrencia') return 'Ocorrência';
    if (tipo === 'foto') return `Foto: ${d!.fotos.find((f) => f.id === alvoId)?.legenda ?? '—'}`;
    return null;
  }

  const BotaoComentar = ({ novo }: { novo: Alvo }) => (
    <Pressable
      onPress={() => comentarSobre(novo)}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={`Comentar sobre ${novo.rotulo}`}
      style={styles.comentar}
    >
      <Feather name="message-square" size={14} color={cores.primaria} />
      <Texto variante="auxiliar" cor={cores.primaria}>
        Comentar
      </Texto>
    </Pressable>
  );

  return (
    <View style={styles.tela}>
      <ScrollView
        ref={rolagem}
        contentContainerStyle={[
          styles.conteudo,
          { paddingTop: insets.top + espaco.sm, paddingBottom: insets.bottom + 180 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Botao
          titulo="Voltar"
          variante="fantasma"
          iconeEsquerda="arrow-left"
          larguraTotal={false}
          onPress={() => router.back()}
        />

        <View style={styles.cabecalho}>
          <View style={styles.linha}>
            <Texto variante="display" style={styles.flex}>
              RDO n. {d.rdo.numero}
            </Texto>
            {bloqueado ? (
              <View
                style={styles.cadeado}
                accessibilityLabel="Conteúdo bloqueado para edição"
                accessibilityRole="image"
              >
                <Feather name="lock" size={icone.md} color={cores.primaria} />
              </View>
            ) : null}
          </View>
          <Texto variante="corpo" cor={cores.textoSecundario}>
            {d.obra.nome}
          </Texto>
          <Texto variante="auxiliar" cor={cores.textoSecundario}>
            {formatarData(d.rdo.data)} · {TURNO[d.rdo.turno]} · por {d.autor?.nome ?? '—'}
            {d.rdo.versao > 1 ? ` · versão ${d.rdo.versao}` : ''}
          </Texto>
          <StatusBadge status={statusVisual(d.rdo.status, d.rdo.devolucao_motivo)} />
        </View>

        {d.rdo.status === 'rascunho' && d.rdo.devolucao_motivo ? (
          <View style={[styles.faixa, { backgroundColor: '#FDF3E3' }]}>
            <Texto variante="corpoForte" cor={cores.aviso}>
              Devolvido para correção
            </Texto>
            <Texto variante="auxiliar" cor={cores.aviso}>
              {d.rdo.devolucao_motivo}
            </Texto>
          </View>
        ) : null}

        {d.rdo.status === 'cancelado' ? (
          <View style={[styles.faixa, { backgroundColor: '#FBE9E7' }]}>
            <Texto variante="corpoForte" cor={cores.erro}>
              Cancelado
            </Texto>
            <Texto variante="auxiliar" cor={cores.erro}>
              {d.rdo.cancelamento_motivo}
            </Texto>
          </View>
        ) : null}

        {d.rdo.motivo_retificacao ? (
          <View style={[styles.faixa, { backgroundColor: '#F2F6FB' }]}>
            <Texto variante="corpoForte" cor={cores.primaria}>
              Retificação (versão {d.rdo.versao})
            </Texto>
            <Texto variante="auxiliar" cor={cores.primaria}>
              {d.rdo.motivo_retificacao}
            </Texto>
            {d.rdo.rdo_origem_id ? (
              <Botao
                titulo="Ver versão original"
                variante="fantasma"
                tamanho="md"
                larguraTotal={false}
                onPress={() => router.push(`/rdo/ver/${d.rdo.rdo_origem_id}`)}
              />
            ) : null}
          </View>
        ) : null}

        <Secao titulo="Clima">
          {d.clima.length === 0 ? (
            <Nada texto="Sem registro de clima." />
          ) : (
            d.clima.map((c) => (
              <View key={c.id} style={styles.item}>
                <Texto variante="corpoForte">
                  {PERIODO[c.periodo]} · {CONDICAO[c.condicao]}
                  {c.temperatura_c !== null
                    ? ` · ${String(c.temperatura_c).replace('.', ',')} °C`
                    : ''}
                </Texto>
                {c.choveu ? (
                  <Texto variante="auxiliar" cor={cores.textoSecundario}>
                    Choveu {c.chuva_duracao_min} min — {c.chuva_impacto}
                  </Texto>
                ) : null}
                {c.horas_paralisadas ? (
                  <Texto variante="auxiliar" cor={cores.textoSecundario}>
                    {c.horas_paralisadas} h paralisadas
                  </Texto>
                ) : null}
              </View>
            ))
          )}
        </Secao>

        <Secao titulo="Mão de obra">
          <View style={styles.total}>
            <Texto variante="corpoForte" cor={cores.sobrePrimaria}>
              {trabalhadores} trabalhadores · {homemHora.toLocaleString('pt-BR')} homem-hora
            </Texto>
          </View>
          {d.maoObra.length === 0 ? (
            <Nada texto="Sem mão de obra lançada." />
          ) : (
            d.maoObra.map((l) => (
              <View key={l.id} style={styles.itemLinha}>
                <Texto variante="corpo" style={styles.flex}>
                  {l.funcao}
                  {l.equipe ? ` (${l.equipe})` : ''}
                </Texto>
                <Texto variante="corpoForte">
                  {l.quantidade} × {String(l.horas).replace('.', ',')} h
                </Texto>
              </View>
            ))
          )}
        </Secao>

        <Secao titulo="Equipamentos">
          {d.equipamentos.length === 0 ? (
            <Nada texto="Sem equipamentos lançados." />
          ) : (
            d.equipamentos.map((e) => (
              <View key={e.id} style={styles.item}>
                <Texto variante="corpoForte">
                  {e.quantidade}× {e.tipo}
                  {e.identificacao ? ` · ${e.identificacao}` : ''}
                </Texto>
                <Texto variante="auxiliar" cor={cores.textoSecundario}>
                  {String(e.horas_produtivas).replace('.', ',')} h produtivas
                  {Number(e.horas_paradas) > 0
                    ? ` · ${String(e.horas_paradas).replace('.', ',')} h paradas — ${e.motivo_parada}`
                    : ''}
                  {e.operador ? ` · operador ${e.operador}` : ''}
                </Texto>
              </View>
            ))
          )}
        </Secao>

        <Secao titulo="Atividades">
          {d.rdo.sem_producao_justificativa ? (
            <View style={styles.item}>
              <Texto variante="corpoForte">Dia sem produção</Texto>
              <Texto variante="auxiliar" cor={cores.textoSecundario}>
                {d.rdo.sem_producao_justificativa}
              </Texto>
            </View>
          ) : d.atividades.length === 0 ? (
            <Nada texto="Sem atividades." />
          ) : (
            d.atividades.map((a) => (
              <View key={a.id} style={styles.item}>
                <Texto variante="corpoForte">{a.servico}</Texto>
                {a.local ? (
                  <Texto variante="auxiliar" cor={cores.textoSecundario}>
                    {a.local}
                  </Texto>
                ) : null}
                {a.descricao ? <Texto variante="auxiliar">{a.descricao}</Texto> : null}
                <Texto variante="auxiliar" cor={cores.textoSecundario}>
                  {a.quantidade_dia !== null
                    ? `${String(a.quantidade_dia).replace('.', ',')} ${a.unidade ?? ''} no dia`
                    : ''}
                  {a.percentual !== null ? ` · ${a.percentual}% acumulado` : ''}
                  {a.situacao ? ` · ${a.situacao}` : ''}
                </Texto>
                <BotaoComentar
                  novo={{ tipo: 'atividade', id: a.id, rotulo: `Atividade: ${a.servico}` }}
                />
              </View>
            ))
          )}
        </Secao>

        <Secao titulo="Ocorrências">
          {d.ocorrencias.length === 0 ? (
            <Nada texto="Sem ocorrências." />
          ) : (
            d.ocorrencias.map((o) => (
              <View key={o.id} style={styles.item}>
                <Texto variante="corpoForte">{o.descricao}</Texto>
                <Texto variante="auxiliar" cor={cores.textoSecundario}>
                  {o.horario ? formatarDataHora(o.horario) : ''}
                  {o.impacto ? ` · Impacto: ${o.impacto}` : ''}
                </Texto>
                {o.acao_imediata ? (
                  <Texto variante="auxiliar">Ação: {o.acao_imediata}</Texto>
                ) : null}
                <BotaoComentar novo={{ tipo: 'ocorrencia', id: o.id, rotulo: 'Ocorrência' }} />
              </View>
            ))
          )}
        </Secao>

        <Secao titulo="Pendências">
          {d.pendencias.length === 0 ? (
            <Nada texto="Sem pendências." />
          ) : (
            d.pendencias.map((p) => (
              <View key={p.id} style={styles.item}>
                <Texto variante="corpoForte">{p.descricao}</Texto>
                <Texto variante="auxiliar" cor={cores.textoSecundario}>
                  {p.responsavel ?? '—'} · prazo {formatarData(p.prazo)} · {p.criticidade ?? ''}
                </Texto>
              </View>
            ))
          )}
        </Secao>

        <Secao titulo={`Fotos (${d.fotos.length})`}>
          {d.fotos.length === 0 ? (
            <Nada texto="Sem fotos." />
          ) : (
            d.fotos.map((f) => (
              <View key={f.id} style={styles.foto}>
                {f.url ? (
                  <Image
                    source={{ uri: f.url }}
                    style={styles.imagem}
                    accessibilityLabel={f.legenda}
                  />
                ) : null}
                <Texto variante="corpoForte">{f.legenda}</Texto>
                {f.atividade_id || f.ocorrencia_id ? (
                  <Texto variante="auxiliar" cor={cores.textoSecundario}>
                    {rotuloAlvo(
                      f.atividade_id ? 'atividade' : 'ocorrencia',
                      f.atividade_id ?? f.ocorrencia_id,
                    )}
                  </Texto>
                ) : null}
                <BotaoComentar novo={{ tipo: 'foto', id: f.id, rotulo: `Foto: ${f.legenda}` }} />
              </View>
            ))
          )}
        </Secao>

        {d.assinaturas.length > 0 ? (
          <Secao titulo="Assinaturas">
            {d.assinaturas.map((a) => (
              <View key={a.id} style={[styles.item, a.ressalva ? styles.itemRessalva : undefined]}>
                <Texto variante="corpoForte">
                  {a.perfis?.nome} —{' '}
                  {a.tipo === 'validacao_master'
                    ? 'validação técnica'
                    : a.tipo === 'ciencia_cliente'
                      ? 'ciência'
                      : 'ciência com ressalva'}
                </Texto>
                <Texto variante="auxiliar" cor={cores.textoSecundario}>
                  {formatarDataHora(a.created_at)} · versão {a.versao}
                </Texto>
                {a.ressalva ? (
                  <Texto variante="corpo" cor={cores.aviso}>
                    Ressalva: {a.ressalva}
                  </Texto>
                ) : null}
              </View>
            ))}
          </Secao>
        ) : null}

        <SecaoPdf d={d} podeGerar={papel === 'master'} aoGerar={atualizarTudo} />

        {d.versoesPosteriores.length > 0 ? (
          <View style={[styles.faixa, { backgroundColor: '#F2F6FB' }]}>
            <Texto variante="corpoForte" cor={cores.primaria}>
              Esta versão foi retificada
            </Texto>
            <Texto variante="auxiliar" cor={cores.primaria}>
              O conteúdo acima continua intacto. A correção está na versão nova.
            </Texto>
            {d.versoesPosteriores.map((v) => (
              <Botao
                key={v.id}
                titulo={`Ver RDO n. ${v.numero} (versão ${v.versao})`}
                variante="fantasma"
                iconeEsquerda="git-branch"
                tamanho="md"
                larguraTotal={false}
                onPress={() => router.push(`/rdo/ver/${v.id}`)}
              />
            ))}
          </View>
        ) : null}

        {papel === 'master' ? <HistoricoAuditoria rdoId={id} /> : null}

        <Secao titulo="Linha do tempo">
          {eventos.map((e, i) => (
            <View key={`${e.quando}-${i}`} style={styles.evento}>
              <View style={[styles.eventoIcone, { borderColor: COR_EVENTO[e.cor] }]}>
                <Feather name={e.icone} size={14} color={COR_EVENTO[e.cor]} />
              </View>
              <View style={styles.flex}>
                <Texto variante="corpoForte">{e.titulo}</Texto>
                <Texto variante="auxiliar" cor={cores.textoSecundario}>
                  {formatarDataHora(e.quando)}
                </Texto>
                {e.detalhe ? <Texto variante="auxiliar">{e.detalhe}</Texto> : null}
              </View>
            </View>
          ))}
        </Secao>

        <View onLayout={(ev) => setPosicaoComentarios(ev.nativeEvent.layout.y)}>
          <Secao titulo={`Comentários (${d.comentarios.length})`}>
            {d.comentarios.map((c) => (
              <View key={c.id} style={styles.comentario}>
                <Texto variante="corpoForte">{c.perfis?.nome}</Texto>
                {rotuloAlvo(c.alvo_tipo, c.alvo_id) ? (
                  <Texto variante="rotulo" cor={cores.primaria}>
                    {rotuloAlvo(c.alvo_tipo, c.alvo_id)?.toUpperCase()}
                  </Texto>
                ) : null}
                <Texto variante="corpo">{c.texto}</Texto>
                <Texto variante="auxiliar" cor={cores.textoDesabilitado}>
                  {formatarDataHora(c.created_at)}
                </Texto>
              </View>
            ))}

            <View style={styles.compor}>
              <View style={styles.linha}>
                <Texto variante="auxiliar" cor={cores.textoSecundario} style={styles.flex}>
                  Sobre: {alvo.rotulo}
                </Texto>
                {alvo.id ? (
                  <Pressable
                    onPress={() => setAlvo({ tipo: 'rdo', id: null, rotulo: 'RDO inteiro' })}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel="Comentar sobre o RDO inteiro"
                  >
                    <Feather name="x" size={icone.sm} color={cores.textoSecundario} />
                  </Pressable>
                ) : null}
              </View>
              <Campo
                rotulo="Novo comentário"
                multiline
                value={comentario}
                onChangeText={setComentario}
                placeholder="Escreva um comentário"
              />
              <Botao
                titulo="Comentar"
                variante="secundaria"
                iconeEsquerda="message-square"
                carregando={enviandoComentario}
                desabilitado={comentario.trim().length === 0}
                onPress={() => void enviarComentario()}
              />
            </View>
          </Secao>
        </View>
      </ScrollView>

      {podeAnalisar || podeDarCiencia || podeEncerrar || podeCancelar || podeEditar ? (
        <View style={[styles.barra, { paddingBottom: insets.bottom + espaco.md }]}>
          {podeEditar ? (
            <Botao titulo="Editar rascunho" iconeEsquerda="edit-2" onPress={() => void editar()} />
          ) : null}

          {podeAnalisar ? (
            <View style={styles.botoes}>
              <Botao
                titulo="Devolver"
                variante="secundaria"
                iconeEsquerda="corner-up-left"
                larguraTotal={false}
                estilo={styles.flex}
                onPress={() =>
                  setAcao({
                    titulo: 'Devolver para correção',
                    descricao:
                      'O RDO volta ao autor, que corrige e reenvia. O motivo fica registrado.',
                    campoTexto: {
                      rotulo: 'Motivo da devolução',
                      placeholder: 'O que precisa ser corrigido',
                      minimo: 10,
                    },
                    rotuloConfirmar: 'Devolver',
                    executar: async (motivo) => {
                      await acoes.devolver(id, motivo);
                      await atualizarTudo();
                    },
                  })
                }
              />
              <Botao
                titulo="Validar e assinar"
                variante="destaque"
                iconeEsquerda="edit-3"
                larguraTotal={false}
                estilo={styles.flex}
                onPress={() =>
                  setAcao({
                    titulo: 'Validar e assinar',
                    descricao:
                      'Depois de assinado, o conteúdo do RDO não pode mais ser alterado por ninguém.',
                    declaracao: DECLARACAO_MASTER,
                    exigirSenha: true,
                    rotuloConfirmar: 'Assinar',
                    executar: async () => {
                      await acoes.validar(id, DECLARACAO_MASTER);
                      await atualizarTudo();
                    },
                  })
                }
              />
            </View>
          ) : null}

          {podeDarCiencia ? (
            <>
              <Botao
                titulo="Assinar ciência"
                variante="destaque"
                iconeEsquerda="check"
                onPress={() =>
                  setAcao({
                    titulo: 'Assinar ciência',
                    declaracao: DECLARACAO_CLIENTE,
                    exigirSenha: true,
                    rotuloConfirmar: 'Assinar',
                    executar: async () => {
                      await acoes.clienteAssinar(id, false, '', DECLARACAO_CLIENTE);
                      await atualizarTudo();
                    },
                  })
                }
              />
              <View style={styles.botoes}>
                <Botao
                  titulo="Com ressalva"
                  variante="secundaria"
                  iconeEsquerda="alert-octagon"
                  larguraTotal={false}
                  estilo={styles.flex}
                  onPress={() =>
                    setAcao({
                      titulo: 'Assinar com ressalva',
                      descricao: 'A ressalva fica gravada na assinatura e aparece no PDF final.',
                      declaracao: DECLARACAO_CLIENTE_COM_RESSALVA,
                      campoTexto: {
                        rotulo: 'Ressalva',
                        placeholder: 'Com o que você não concorda, e por quê',
                        minimo: 10,
                      },
                      exigirSenha: true,
                      rotuloConfirmar: 'Assinar com ressalva',
                      executar: async (ressalva) => {
                        await acoes.clienteAssinar(
                          id,
                          true,
                          ressalva,
                          DECLARACAO_CLIENTE_COM_RESSALVA,
                        );
                        await atualizarTudo();
                      },
                    })
                  }
                />
                <Botao
                  titulo="Esclarecer"
                  variante="secundaria"
                  iconeEsquerda="help-circle"
                  larguraTotal={false}
                  estilo={styles.flex}
                  onPress={() =>
                    setAcao({
                      titulo: 'Pedir esclarecimento',
                      descricao:
                        'O RDO volta para análise do responsável técnico, com a sua pergunta.',
                      campoTexto: { rotulo: 'Sua pergunta', minimo: 10 },
                      rotuloConfirmar: 'Enviar pedido',
                      executar: async (texto) => {
                        await acoes.pedirEsclarecimento(id, texto);
                        await atualizarTudo();
                      },
                    })
                  }
                />
              </View>
            </>
          ) : null}

          {podeEncerrar ? (
            <Botao
              titulo="Retificar"
              variante="secundaria"
              iconeEsquerda="git-branch"
              onPress={() =>
                setAcao({
                  titulo: 'Retificar RDO',
                  descricao:
                    'Cria uma nova versão, em rascunho, com o conteúdo atual. Esta versão fica intacta e marcada como retificada.',
                  campoTexto: { rotulo: 'Motivo da retificação', minimo: 10 },
                  rotuloConfirmar: 'Criar nova versão',
                  executar: async (motivo) => {
                    const novo = await acoes.retificar(id, motivo);
                    await atualizarTudo();
                    if (novo) router.replace(`/rdo/ver/${novo.id}`);
                  },
                })
              }
            />
          ) : null}

          {podeCancelar ? (
            <Botao
              titulo="Cancelar RDO"
              variante="fantasma"
              iconeEsquerda="x-octagon"
              onPress={() =>
                setAcao({
                  titulo: 'Cancelar RDO',
                  descricao: 'O RDO não é apagado: fica registrado como cancelado, com o motivo.',
                  campoTexto: { rotulo: 'Motivo do cancelamento', minimo: 10 },
                  rotuloConfirmar: 'Cancelar RDO',
                  perigo: true,
                  executar: async (motivo) => {
                    await acoes.cancelar(id, motivo);
                    await atualizarTudo();
                  },
                })
              }
            />
          ) : null}
        </View>
      ) : null}

      <ModalAcao config={acao} onFechar={() => setAcao(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo },
  flex: { flex: 1 },
  vazio: { flex: 1, justifyContent: 'center', padding: espaco.xl, gap: espaco.lg },
  conteudo: { paddingHorizontal: espaco.lg, gap: espaco.lg },
  cabecalho: { gap: espaco.xs },
  linha: { flexDirection: 'row', alignItems: 'center', gap: espaco.sm },
  cadeado: {
    width: 44,
    height: 44,
    borderRadius: raio.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E7EDF5',
  },
  faixa: { gap: espaco.xs, padding: espaco.lg, borderRadius: raio.md },
  secao: { gap: espaco.sm, marginTop: espaco.md },
  item: { gap: 2, padding: espaco.md, borderRadius: raio.sm, backgroundColor: cores.superficie },
  itemRessalva: { backgroundColor: '#FDF3E3' },
  itemLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.md,
    padding: espaco.md,
    borderRadius: raio.sm,
    backgroundColor: cores.superficie,
  },
  total: { padding: espaco.md, borderRadius: raio.sm, backgroundColor: cores.primaria },
  foto: {
    gap: espaco.xs,
    padding: espaco.sm,
    borderRadius: raio.md,
    backgroundColor: cores.superficie,
  },
  imagem: { width: '100%', aspectRatio: 4 / 3, borderRadius: raio.sm },
  comentar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
    minHeight: 32,
  },
  evento: { flexDirection: 'row', gap: espaco.md },
  eventoIcone: {
    width: 30,
    height: 30,
    borderRadius: raio.pill,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  comentario: {
    gap: 2,
    padding: espaco.md,
    borderRadius: raio.sm,
    backgroundColor: cores.superficie,
  },
  compor: { gap: espaco.md, marginTop: espaco.sm },
  barra: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    gap: espaco.sm,
    paddingTop: espaco.md,
    paddingHorizontal: espaco.lg,
    backgroundColor: cores.fundo,
    borderTopWidth: 1,
    borderTopColor: cores.borda,
  },
  botoes: { flexDirection: 'row', gap: espaco.md },
});
