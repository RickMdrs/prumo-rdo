import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { Botao, Texto } from '@/components/ui';
import type { RdoCompleto } from '@/features/rdo/detalhe';
import {
  baixarPdf,
  compartilharPdf,
  gerarPdfFinal,
  verificarPdf,
  type Etapa,
  type ResultadoVerificacao,
} from '@/lib/pdf';
import { cores, espaco, icone, raio } from '@/theme/tokens';

const ETAPA: Record<Etapa, string> = {
  fotos: 'Baixando as fotos…',
  pdf: 'Montando o PDF…',
  hash: 'Calculando o SHA-256…',
  envio: 'Enviando para o armazenamento…',
  registro: 'Registrando o hash no banco…',
};

type Props = {
  d: RdoCompleto;
  podeGerar: boolean;
  aoGerar: () => Promise<void>;
};

export function SecaoPdf({ d, podeGerar, aoGerar }: Props) {
  const [etapa, setEtapa] = useState<Etapa | null>(null);
  const [compartilhando, setCompartilhando] = useState(false);
  const [verificando, setVerificando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoVerificacao | null>(null);

  if (d.rdo.status !== 'finalizado' && !d.rdo.pdf_hash) return null;

  async function gerar() {
    try {
      const { uri } = await gerarPdfFinal(d, setEtapa);
      setEtapa(null);
      await aoGerar();
      Alert.alert('PDF final emitido', 'O hash foi registrado. Deseja compartilhar agora?', [
        { text: 'Depois', style: 'cancel' },
        { text: 'Compartilhar', onPress: () => void compartilharPdf(uri) },
      ]);
    } catch (e) {
      setEtapa(null);
      Alert.alert('Não foi possível gerar o PDF', e instanceof Error ? e.message : '');
    }
  }

  async function compartilhar() {
    setCompartilhando(true);
    try {
      const arquivo = await baixarPdf(d);
      await compartilharPdf(arquivo.uri);
    } catch (e) {
      Alert.alert('Não foi possível compartilhar', e instanceof Error ? e.message : '');
    } finally {
      setCompartilhando(false);
    }
  }

  async function verificar() {
    setVerificando(true);
    setResultado(null);
    try {
      setResultado(await verificarPdf(d));
    } catch (e) {
      Alert.alert('Não foi possível verificar', e instanceof Error ? e.message : '');
    } finally {
      setVerificando(false);
    }
  }

  return (
    <View style={styles.base}>
      <Texto variante="subtitulo">PDF final</Texto>

      {!d.rdo.pdf_hash ? (
        podeGerar ? (
          <>
            <Texto variante="auxiliar" cor={cores.textoSecundario}>
              Gera o documento com todas as seções, fotos, ressalva e assinaturas, calcula o SHA-256
              e registra no banco. Só pode ser feito uma vez.
            </Texto>
            <Botao
              titulo={etapa ? ETAPA[etapa] : 'Gerar PDF final'}
              iconeEsquerda="file-text"
              carregando={etapa !== null}
              onPress={() => void gerar()}
            />
          </>
        ) : (
          <Texto variante="auxiliar" cor={cores.textoSecundario}>
            Aguardando o responsável técnico emitir o PDF final.
          </Texto>
        )
      ) : (
        <>
          <View style={styles.hash}>
            <Texto variante="rotulo" cor={cores.textoSecundario}>
              SHA-256 REGISTRADO
            </Texto>
            <Texto variante="auxiliar" style={styles.mono} selectable>
              {d.rdo.pdf_hash}
            </Texto>
          </View>

          <Botao
            titulo="Compartilhar PDF"
            iconeEsquerda="share-2"
            carregando={compartilhando}
            onPress={() => void compartilhar()}
          />
          <Botao
            titulo="Verificar autenticidade"
            variante="secundaria"
            iconeEsquerda="shield"
            carregando={verificando}
            onPress={() => void verificar()}
          />

          {resultado ? (
            <View
              style={[styles.resultado, resultado.integro ? styles.integro : styles.divergente]}
              accessibilityLiveRegion="polite"
            >
              <View style={styles.linha}>
                <Feather
                  name={resultado.integro ? 'check-circle' : 'x-circle'}
                  size={icone.lg}
                  color={resultado.integro ? cores.sucesso : cores.erro}
                />
                <Texto variante="subtitulo" cor={resultado.integro ? cores.sucesso : cores.erro}>
                  {resultado.integro ? 'Documento íntegro' : 'Documento divergente'}
                </Texto>
              </View>
              <Texto variante="auxiliar" cor={cores.textoSecundario}>
                {resultado.integro
                  ? 'O arquivo armazenado é idêntico, byte a byte, ao emitido.'
                  : 'O arquivo armazenado não corresponde ao hash registrado na emissão.'}
              </Texto>
              <Texto variante="rotulo" cor={cores.textoSecundario}>
                CALCULADO AGORA
              </Texto>
              <Texto variante="auxiliar" style={styles.mono} selectable>
                {resultado.hashCalculado}
              </Texto>
            </View>
          ) : null}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  base: { gap: espaco.md, marginTop: espaco.md },
  hash: { gap: 4, padding: espaco.md, borderRadius: raio.sm, backgroundColor: cores.superficie },
  mono: { fontFamily: 'monospace', fontSize: 12 },
  resultado: { gap: espaco.xs, padding: espaco.lg, borderRadius: raio.md, borderWidth: 1.5 },
  integro: { backgroundColor: '#E3F2EA', borderColor: cores.sucesso },
  divergente: { backgroundColor: '#FBE9E7', borderColor: cores.erro },
  linha: { flexDirection: 'row', alignItems: 'center', gap: espaco.sm },
});
