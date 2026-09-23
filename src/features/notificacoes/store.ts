import { create } from 'zustand';

type EstadoAvisos = {
  naoLidas: number;
  /** Muda a cada aviso novo — a central usa para recarregar. */
  versao: number;
  definirNaoLidas: (n: number) => void;
  chegouNova: () => void;
};

export const useAvisosStore = create<EstadoAvisos>((set) => ({
  naoLidas: 0,
  versao: 0,
  definirNaoLidas: (naoLidas) => set({ naoLidas }),
  chegouNova: () => set((e) => ({ naoLidas: e.naoLidas + 1, versao: e.versao + 1 })),
}));
