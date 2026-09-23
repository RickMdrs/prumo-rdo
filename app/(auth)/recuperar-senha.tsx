import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';
import { z } from 'zod';

import { Botao, Campo, Cartao, Tela, Texto } from '@/components/ui';
import { useAuth } from '@/features/auth/useAuth';
import { cores, espaco, raio } from '@/theme/tokens';

const esquema = z.object({
  email: z.string().trim().min(1, 'Informe o e-mail').pipe(z.email('E-mail inválido')),
});

type Formulario = z.infer<typeof esquema>;

export default function RecuperarSenha() {
  const { recuperarSenha } = useAuth();
  const router = useRouter();
  const [enviado, setEnviado] = useState(false);
  const [erroGeral, setErroGeral] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Formulario>({
    resolver: zodResolver(esquema),
    defaultValues: { email: '' },
  });

  async function aoEnviar(dados: Formulario) {
    setErroGeral(null);
    try {
      await recuperarSenha(dados.email);
      setEnviado(true);
    } catch (erro) {
      setErroGeral(erro instanceof Error ? erro.message : 'Não foi possível enviar o e-mail.');
    }
  }

  return (
    <Tela>
      <Botao
        titulo="Voltar"
        variante="fantasma"
        iconeEsquerda="arrow-left"
        larguraTotal={false}
        onPress={() => router.back()}
      />

      <Texto variante="display" style={styles.chamada}>
        Recuperar senha
      </Texto>

      {enviado ? (
        <Cartao
          variante="solido"
          iconeChip="mail"
          titulo="E-mail enviado"
          descricao="Se existir uma conta com esse endereço, o link de redefinição chegou na caixa de entrada."
        />
      ) : (
        <View style={styles.formulario}>
          <Texto variante="corpo" cor={cores.textoSecundario}>
            Informe o e-mail da sua conta. Enviaremos um link para você definir uma nova senha.
          </Texto>

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
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                erro={errors.email?.message}
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
            titulo="Enviar link"
            carregando={isSubmitting}
            onPress={() => void handleSubmit(aoEnviar)()}
          />
        </View>
      )}
    </Tela>
  );
}

const styles = StyleSheet.create({
  chamada: { marginTop: espaco.lg, marginBottom: espaco.xl },
  formulario: { gap: espaco.lg },
  aviso: {
    backgroundColor: '#FBE9E7',
    borderRadius: raio.sm,
    padding: espaco.md,
  },
});
