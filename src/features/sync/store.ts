import { create } from 'zustand';

type EstadoFila = {
  pendentes: number;
  sincronizando: boolean;
  ultimaSincronizacao: string | null;
  ultimoErro: string | null;
  /** Incrementa a cada rodada concluída — telas usam para recarregar listas. */
  versao: number;

  definirPendentes: (n: number) => void;
  iniciar: () => void;
  concluir: (erro: string | null) => void;
};

export const useFilaStore = create<EstadoFila>((set) => ({
  pendentes: 0,
  sincronizando: false,
  ultimaSincronizacao: null,
  ultimoErro: null,
  versao: 0,

  definirPendentes: (pendentes) => set({ pendentes }),
  iniciar: () => set({ sincronizando: true }),
  concluir: (ultimoErro) =>
    set((e) => ({
      sincronizando: false,
      ultimoErro,
      ultimaSincronizacao: new Date().toISOString(),
      versao: e.versao + 1,
    })),
}));
