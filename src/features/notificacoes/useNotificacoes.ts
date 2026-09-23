import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';
import { contarNaoLidas, marcarLida, type Notificacao } from './api';
import { useAvisosStore } from './store';

// Sem isto, uma notificação local disparada com o app aberto não aparece.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function prepararPermissao(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('rdo', {
      name: 'Movimentação de RDOs',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 200, 120, 200],
    });
  }
  const atual = await Notifications.getPermissionsAsync();
  if (atual.granted) return true;
  const pedido = await Notifications.requestPermissionsAsync();
  return pedido.granted;
}

async function avisarLocalmente(n: Notificacao): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: n.titulo,
      body: n.corpo ?? undefined,
      data: { rdoId: n.rdo_id, notificacaoId: n.id },
    },
    trigger: Platform.OS === 'android' ? { channelId: 'rdo' } : null,
  });
}

/**
 * O caminho completo da Parte 9: função do banco grava em `notificacoes` →
 * Realtime entrega a linha nova → o aparelho dispara uma notificação local.
 * Montado uma vez, no layout das telas autenticadas.
 */
export function useNotificacoes(usuarioId: string | null) {
  const router = useRouter();
  const definirNaoLidas = useAvisosStore((e) => e.definirNaoLidas);
  const chegouNova = useAvisosStore((e) => e.chegouNova);

  useEffect(() => {
    if (!usuarioId) return;

    let permitido = false;
    void prepararPermissao().then((ok) => {
      permitido = ok;
    });
    void contarNaoLidas().then(definirNaoLidas);

    const canal = supabase
      .channel(`notificacoes:${usuarioId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notificacoes',
          filter: `usuario_id=eq.${usuarioId}`,
        },
        (mudanca) => {
          const nova = mudanca.new as Notificacao;
          chegouNova();
          if (permitido) void avisarLocalmente(nova);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(canal);
    };
  }, [usuarioId, definirNaoLidas, chegouNova]);

  // Toque em "abrir" na notificação leva direto ao RDO.
  useEffect(() => {
    const assinatura = Notifications.addNotificationResponseReceivedListener((resposta) => {
      const dados = resposta.notification.request.content.data as {
        rdoId?: string;
        notificacaoId?: string;
      };
      if (dados.notificacaoId) {
        void marcarLida(dados.notificacaoId).then(() => contarNaoLidas().then(definirNaoLidas));
      }
      if (dados.rdoId) router.push(`/rdo/ver/${dados.rdoId}`);
    });
    return () => assinatura.remove();
  }, [router, definirNaoLidas]);
}
