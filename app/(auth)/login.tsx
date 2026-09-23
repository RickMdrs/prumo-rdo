import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { z } from 'zod';

import { MarcaPrumo } from '@/components/MarcaPrumo';
import { Botao, Campo, Tela, Texto } from '@/components/ui';
import { useAuth } from '@/features/auth/useAuth';
import { cores, espaco, raio } from '@/theme/tokens';

const esquema = z.object({
  email: z.string().trim().min(1, 'Informe o e-mail').pipe(z.email('E-mail inválido')),
  senha: z.string().min(1, 'Informe a senha'),
});

type Formulario = z.infer<typeof esquema>;

export default function Login() {
  const { entrar } = useAuth();
  const [erroGeral, setErroGeral] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Formulario>({
    resolver: zodResolver(esquema),
    defaultValues: { email: '', senha: '' },
  });

  async function aoEnviar(dados: Formulario) {
    setErroGeral(null);
    try {
      await entrar(dados.email, dados.senha);
    } catch (erro) {
      setErroGeral(erro instanceof Error ? erro.message : 'Não foi possível entrar.');
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.teclado}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Tela>
        <View style={styles.marca}>
          <MarcaPrumo tamanho={64} />
          <View style={styles.marcaTextos}>
            <Texto variante="titulo">Prumo RDO</Texto>
            <Texto variante="auxiliar" cor={cores.textoSecundario}>
              PLANENGEN Consultoria e Construção
            </Texto>
          </View>
        </View>

        <Texto variante="display" style={styles.chamada}>
          Entrar
        </Texto>

        <View style={styles.formulario}>
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <Campo
                rotulo="E-mail"
                placeholder="voce@empresa.com.br"
                iconeEsquerda="mail"
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                textContentType="emailAddress"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                erro={errors.email?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="senha"
            render={({ field: { onChange, onBlur, value } }) => (
              <Campo
                rotulo="Senha"
                placeholder="Sua senha"
                iconeEsquerda="lock"
                segredo
                autoCapitalize="none"
                autoComplete="current-password"
                textContentType="password"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                onSubmitEditing={() => void handleSubmit(aoEnviar)()}
                returnKeyType="go"
                erro={errors.senha?.message}
              />
            )}
          />

          {erroGeral ? (
            <View style={styles.aviso} accessibilityLiveRegion="polite">
              <Texto variante="auxiliar" cor={cores.erro}>
                {erroGeral}
              </Texto>
            </View>
          ) : null}

          <Botao
            titulo="Entrar"
            iconeDireita="arrow-right"
            carregando={isSubmitting}
            onPress={() => void handleSubmit(aoEnviar)()}
          />

          <Link href="/recuperar-senha" asChild>
            <Botao titulo="Esqueci minha senha" variante="fantasma" onPress={() => {}} />
          </Link>
        </View>
      </Tela>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  teclado: { flex: 1 },
  marca: { flexDirection: 'row', alignItems: 'center', gap: espaco.md },
  marcaTextos: { flex: 1, gap: 2 },
  chamada: { marginTop: espaco.xxl, marginBottom: espaco.lg },
  formulario: { gap: espaco.lg },
  aviso: {
    backgroundColor: '#FBE9E7',
    borderRadius: raio.sm,
    padding: espaco.md,
  },
});
