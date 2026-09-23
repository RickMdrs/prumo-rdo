import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Botao, Carregando, Texto } from '@/components/ui';
import { useAuth } from '@/features/auth/useAuth';
import { ROTA_INICIAL } from '@/features/navegacao/abas';
import { cores, espaco } from '@/theme/tokens';

/**
 * Porta de entrada: manda cada papel para a sua primeira aba.
 */
export default function Indice() {
  const { sessao, perfil, hidratando, sair } = useAuth();
  const [demorou, setDemorou] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setDemorou(true), 8000);
    return () => clearTimeout(id);
  }, []);

  if (hidratando) return <Carregando />;

  if (!sessao) return <Redirect href="/login" />;

  if (!perfil) {
    // Conta existe no Auth mas não tem linha em `perfis` — acontece quando o
    // usuário é criado direto no painel, sem passar pelo seed.
    if (demorou) {
      return (
        <View style={styles.erro}>
          <Texto variante="subtitulo" centro>
            Sua conta não tem perfil cadastrado
          </Texto>
          <Texto variante="corpo" cor={cores.textoSecundario} centro>
            Peça ao responsável técnico para vincular seu usuário à empresa.
          </Texto>
          <Botao titulo="Sair" variante="secundaria" onPress={() => void sair()} />
        </View>
      );
    }
    return <Carregando mensagem="Carregando seu perfil" />;
  }

  return <Redirect href={ROTA_INICIAL[perfil.papel]} />;
}

const styles = StyleSheet.create({
  erro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: espaco.lg,
    padding: espaco.xl,
    backgroundColor: cores.fundo,
  },
});
