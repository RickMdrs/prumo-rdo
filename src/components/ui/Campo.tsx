import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import { ALVO_TOQUE, cores, espaco, icone, raio, tipografia } from '@/theme/tokens';
import { Texto } from './Texto';

type Props = Omit<TextInputProps, 'style'> & {
  rotulo: string;
  /** Texto curto de apoio, para campos que costumam gerar dúvida. */
  ajuda?: string;
  erro?: string;
  obrigatorio?: boolean;
  iconeEsquerda?: keyof typeof Feather.glyphMap;
  /** Campo de senha, com o botão de mostrar/ocultar. */
  segredo?: boolean;
  estilo?: ViewStyle;
};

export function Campo({
  rotulo,
  ajuda,
  erro,
  obrigatorio = false,
  iconeEsquerda,
  segredo = false,
  estilo,
  multiline,
  ...rest
}: Props) {
  const [focado, setFocado] = useState(false);
  const [visivel, setVisivel] = useState(false);

  const corBorda = erro ? cores.erro : focado ? cores.primaria : cores.borda;

  return (
    <View style={[styles.wrapper, estilo]}>
      <Texto variante="auxiliar" cor={cores.textoSecundario}>
        {rotulo}
        {obrigatorio ? (
          <Texto variante="auxiliar" cor={cores.erro}>
            {' *'}
          </Texto>
        ) : null}
      </Texto>

      <View
        style={[
          styles.caixa,
          { borderColor: corBorda },
          multiline && styles.caixaMultilinha,
          focado && styles.caixaFocada,
        ]}
      >
        {iconeEsquerda ? (
          <Feather name={iconeEsquerda} size={icone.md} color={cores.textoSecundario} />
        ) : null}
        <TextInput
          style={[styles.input, multiline && styles.inputMultilinha]}
          placeholderTextColor={cores.textoDesabilitado}
          maxFontSizeMultiplier={1.4}
          accessibilityLabel={rotulo}
          multiline={multiline}
          secureTextEntry={segredo && !visivel}
          onFocus={(e) => {
            setFocado(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocado(false);
            rest.onBlur?.(e);
          }}
          {...rest}
        />
        {segredo ? (
          <Pressable
            onPress={() => setVisivel((v) => !v)}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={visivel ? 'Ocultar a senha' : 'Mostrar a senha'}
          >
            <Feather
              name={visivel ? 'eye-off' : 'eye'}
              size={icone.md}
              color={cores.textoSecundario}
            />
          </Pressable>
        ) : null}
      </View>

      {erro ? (
        <View style={styles.mensagem}>
          <Feather name="alert-circle" size={icone.sm} color={cores.erro} />
          <Texto variante="auxiliar" cor={cores.erro} style={styles.mensagemTexto}>
            {erro}
          </Texto>
        </View>
      ) : ajuda ? (
        <Texto variante="auxiliar" cor={cores.textoDesabilitado}>
          {ajuda}
        </Texto>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: espaco.xs },
  caixa: {
    minHeight: ALVO_TOQUE + 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.sm,
    paddingHorizontal: espaco.lg,
    borderWidth: 1,
    borderRadius: raio.sm,
    backgroundColor: cores.superficie,
  },
  caixaFocada: { backgroundColor: cores.fundo },
  caixaMultilinha: {
    minHeight: 112,
    alignItems: 'flex-start',
    paddingVertical: espaco.md,
  },
  input: {
    flex: 1,
    ...tipografia.corpo,
    color: cores.texto,
    paddingVertical: espaco.md,
  },
  inputMultilinha: {
    paddingVertical: 0,
    textAlignVertical: 'top',
  },
  mensagem: { flexDirection: 'row', alignItems: 'center', gap: espaco.xs },
  mensagemTexto: { flex: 1 },
});
