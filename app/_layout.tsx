import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  useFonts,
} from '@expo-google-fonts/plus-jakarta-sans';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Carregando } from '@/components/ui';
import { TravaBiometrica } from '@/features/auth/TravaBiometrica';
import { useAuth, useHidratarSessao } from '@/features/auth/useAuth';
import { cores } from '@/theme/tokens';

void SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

function Navegacao() {
  useHidratarSessao();

  const { sessao, hidratando, travado } = useAuth();
  const segmentos = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (hidratando) return;

    const emAuth = segmentos[0] === '(auth)';

    if (!sessao && !emAuth) {
      router.replace('/login');
      return;
    }

    if (sessao && emAuth) {
      router.replace('/');
    }
  }, [sessao, hidratando, segmentos, router]);

  if (hidratando) {
    return <Carregando mensagem="Abrindo o Prumo RDO" />;
  }

  if (sessao && travado) {
    return <TravaBiometrica />;
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

export default function LayoutRaiz() {
  const [fontesCarregadas, erroFontes] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });

  useEffect(() => {
    if (fontesCarregadas || erroFontes) {
      void SplashScreen.hideAsync();
    }
  }, [fontesCarregadas, erroFontes]);

  if (!fontesCarregadas && !erroFontes) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <Navegacao />
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
