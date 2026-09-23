import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from '@/features/auth/useAuth';
import { buscarRdoLocal, salvarRdoLocal } from '@/lib/db-local';
import { agendarSincronizacao } from '@/lib/sync';
import type { RascunhoRdo } from './tipos';

const ATRASO_GRAVACAO_MS = 350;

/**
 * Estado do RDO em edição. Cada mudança vai para o SQLite logo em seguida
 * (salvamento automático local) e agenda o envio — o formulário nunca espera
 * a rede.
 */
export function useRascunho(id: string) {
  const { sessao } = useAuth();
  const autorId = sessao?.user.id ?? '';

  const [rascunho, setRascunho] = useState<RascunhoRdo | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [idRemoto, setIdRemoto] = useState<string | null>(null);

  const atual = useRef<RascunhoRdo | null>(null);
  const pendente = useRef<ReturnType<typeof setTimeout> | null>(null);

  const gravar = useCallback(async () => {
    pendente.current = null;
    if (!atual.current || !autorId) return;
    await salvarRdoLocal(atual.current, autorId);
    agendarSincronizacao();
  }, [autorId]);

  useEffect(() => {
    let vivo = true;
    void buscarRdoLocal(id).then((local) => {
      if (!vivo) return;
      atual.current = local?.rascunho ?? null;
      setRascunho(local?.rascunho ?? null);
      setIdRemoto(local?.id_remoto ?? null);
      setCarregando(false);
    });
    return () => {
      vivo = false;
    };
  }, [id]);

  // Saiu da tela com gravação agendada: grava agora, não perde a última letra.
  useEffect(() => {
    return () => {
      if (pendente.current) {
        clearTimeout(pendente.current);
        void gravar();
      }
    };
  }, [gravar]);

  const atualizar = useCallback(
    (mudar: (r: RascunhoRdo) => RascunhoRdo) => {
      if (!atual.current) return;
      const novo = mudar(atual.current);
      atual.current = novo;
      setRascunho(novo);

      if (pendente.current) clearTimeout(pendente.current);
      pendente.current = setTimeout(() => void gravar(), ATRASO_GRAVACAO_MS);
    },
    [gravar],
  );

  const gravarAgora = useCallback(async () => {
    if (pendente.current) clearTimeout(pendente.current);
    await gravar();
  }, [gravar]);

  const recarregar = useCallback(async () => {
    const local = await buscarRdoLocal(id);
    atual.current = local?.rascunho ?? null;
    setRascunho(local?.rascunho ?? null);
    setIdRemoto(local?.id_remoto ?? null);
  }, [id]);

  return { rascunho, carregando, idRemoto, atualizar, gravarAgora, recarregar };
}
