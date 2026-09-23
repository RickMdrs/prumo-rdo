import { Redirect, Tabs } from 'expo-router';

import { BarraAbas } from '@/components/BarraAbas';
import { Carregando } from '@/components/ui';
import { useAuth } from '@/features/auth/useAuth';
import { ABAS, abaVisivel } from '@/features/navegacao/abas';
import { useNotificacoes } from '@/features/notificacoes/useNotificacoes';
import { useSincronizacaoAutomatica } from '@/features/sync/hooks';

export default function LayoutApp() {
  const { sessao, perfil, hidratando } = useAuth();
  useSincronizacaoAutomatica();
  useNotificacoes(sessao?.user.id ?? null);

  if (hidratando) return <Carregando />;
  if (!sessao) return <Redirect href="/login" />;
  if (!perfil) return <Carregando mensagem="Carregando seu perfil" />;

  const papel = perfil.papel;

  return (
    <Tabs
      tabBar={(props) => <BarraAbas {...props} />}
      screenOptions={{ headerShown: false, animation: 'none' }}
    >
      {Object.values(ABAS).map((aba) => (
        <Tabs.Screen
          key={aba.rota}
          name={aba.rota}
          options={{
            title: aba.rotulo,
            // href null tira a rota da barra e do alcance da navegação:
            // é assim que o Operacional não chega em "Obras" nem por rota direta.
            href: abaVisivel(papel, aba.rota) ? aba.href : null,
          }}
        />
      ))}
    </Tabs>
  );
}
