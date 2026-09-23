import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { Botao, Campo, Texto } from '@/components/ui';
import { useAuth } from '@/features/auth/useAuth';
import { cores, espaco, raio } from '@/theme/tokens';

export type ConfigAcao = {
  titulo: string;
  descricao?: string;
  /** Texto que será assinado — exibido por inteiro antes da confirmação. */
  declaracao?: string;
  campoTexto?: { rotulo: string; placeholder?: string; minimo: number };
  /** Ação com valor de assinatura: exige a senha de novo. */
  exigirSenha?: boolean;
  rotuloConfirmar: string;
  perigo?: boolean;
  executar: (texto: string) => Promise<void>;
};

type Props = { config: ConfigAcao | null; onFechar: () => void };

export function ModalAcao({ config, onFechar }: Props) {
  const { confirmarSenha } = useAuth();
  const [texto, setTexto] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [executando, setExecutando] = useState(false);

  function fechar() {
    setTexto('');
    setSenha('');
    setErro(null);
    onFechar();
  }

  const textoCurto =
    config?.campoTexto !== undefined && texto.trim().length < config.campoTexto.minimo;

  async function confirmar() {
    if (!config) return;
    setErro(null);
    setExecutando(true);
    try {
      if (config.exigirSenha) {
        const ok = await confirmarSenha(senha);
        if (!ok) {
          setErro('Senha incorreta. A assinatura não foi registrada.');
          return;
        }
      }
      await config.executar(texto.trim());
      fechar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível concluir.');
    } finally {
      setExecutando(false);
    }
  }

  return (
    <Modal visible={config !== null} animationType="slide" transparent onRequestClose={fechar}>
      <View style={styles.fundo}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.folhaWrap}
        >
          <ScrollView
            style={styles.folha}
            contentContainerStyle={styles.conteudo}
            keyboardShouldPersistTaps="handled"
          >
            {config ? (
              <>
                <Texto variante="titulo">{config.titulo}</Texto>
                {config.descricao ? (
                  <Texto variante="corpo" cor={cores.textoSecundario}>
                    {config.descricao}
                  </Texto>
                ) : null}

                {config.declaracao ? (
                  <View style={styles.declaracao}>
                    <Texto variante="rotulo" cor={cores.primaria}>
                      DECLARAÇÃO
                    </Texto>
                    <Texto variante="corpo">{config.declaracao}</Texto>
                  </View>
                ) : null}

                {config.campoTexto ? (
                  <Campo
                    rotulo={config.campoTexto.rotulo}
                    placeholder={config.campoTexto.placeholder}
                    obrigatorio
                    multiline
                    value={texto}
                    onChangeText={setTexto}
                    ajuda={`Mínimo de ${config.campoTexto.minimo} caracteres.`}
                  />
                ) : null}

                {config.exigirSenha ? (
                  <Campo
                    rotulo="Confirme sua senha para assinar"
                    iconeEsquerda="lock"
                    segredo
                    autoCapitalize="none"
                    value={senha}
                    onChangeText={setSenha}
                  />
                ) : null}

                {erro ? (
                  <View style={styles.erro} accessibilityLiveRegion="assertive">
                    <Texto variante="auxiliar" cor={cores.erro}>
                      {erro}
                    </Texto>
                  </View>
                ) : null}

                <Botao
                  titulo={config.rotuloConfirmar}
                  variante={config.perigo ? 'perigo' : 'primaria'}
                  carregando={executando}
                  desabilitado={textoCurto || (config.exigirSenha === true && senha.length === 0)}
                  onPress={() => void confirmar()}
                />
                <Botao titulo="Cancelar" variante="fantasma" onPress={fechar} />
              </>
            ) : null}
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fundo: { flex: 1, justifyContent: 'flex-end', backgroundColor: cores.overlay },
  folhaWrap: { maxHeight: '92%' },
  folha: {
    backgroundColor: cores.fundo,
    borderTopLeftRadius: raio.lg,
    borderTopRightRadius: raio.lg,
  },
  conteudo: { gap: espaco.lg, padding: espaco.xl, paddingBottom: espaco.xxxl },
  declaracao: {
    gap: espaco.sm,
    padding: espaco.lg,
    borderRadius: raio.md,
    backgroundColor: '#F2F6FB',
    borderLeftWidth: 4,
    borderLeftColor: cores.primaria,
  },
  erro: { padding: espaco.md, borderRadius: raio.sm, backgroundColor: '#FBE9E7' },
});
