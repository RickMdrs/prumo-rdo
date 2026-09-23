import NetInfo from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { sincronizar } from '@/lib/sync';

export function useStatusConexao() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    return NetInfo.addEventListener((estado) => {
      setOnline(Boolean(estado.isConnected) && estado.isInternetReachable !== false);
    });
  }, []);

  return { online };
}

/**
 * Liga os três gatilhos da Parte 5: app abriu, app voltou do segundo plano e
 * rede voltou. Montado uma única vez, no layout das telas autenticadas.
 */
export function useSincronizacaoAutomatica() {
  useEffect(() => {
    void sincronizar();

    let estavaOffline = false;
    const pararRede = NetInfo.addEventListener((estado) => {
      const online = Boolean(estado.isConnected) && estado.isInternetReachable !== false;
      if (online && estavaOffline) void sincronizar();
      estavaOffline = !online;
    });

    const pararApp = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') void sincronizar();
    });

    return () => {
      pararRede();
      pararApp.remove();
    };
  }, []);
}
