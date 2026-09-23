import { Stack } from 'expo-router';

import { cores } from '@/theme/tokens';

export default function LayoutAuth() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: cores.fundo },
      }}
    />
  );
}
