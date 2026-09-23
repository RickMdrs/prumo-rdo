import { Redirect, Stack } from 'expo-router';

import { useAuth } from '@/features/auth/useAuth';
import { ROTA_INICIAL } from '@/features/navegacao/abas';
import { cores } from '@/theme/tokens';

export default function LayoutObras() {
  const { perfil } = useAuth();

  // A aba já é escondida por papel, mas um link direto (deep link) chegaria
  // aqui assim mesmo. A RLS barraria a escrita de qualquer jeito; esta guarda
  // evita que o usuário veja uma tela que não é dele.
  if (perfil && perfil.papel !== 'master') {
    return <Redirect href={ROTA_INICIAL[perfil.papel]} />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: cores.fundo },
      }}
    />
  );
}
