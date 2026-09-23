import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';

import type { Tabelas } from '@/types/database';

export type Perfil = Tabelas<'perfis'>;
export type Papel = Perfil['papel'];

type EstadoAuth = {
  sessao: Session | null;
  perfil: Perfil | null;
  /** Verdadeiro até a sessão salva no aparelho ser lida pela primeira vez. */
  hidratando: boolean;
  /** Trava biométrica ativa e ainda não vencida nesta abertura do app. */
  travado: boolean;

  definirSessao: (sessao: Session | null) => void;
  definirPerfil: (perfil: Perfil | null) => void;
  concluirHidratacao: () => void;
  definirTravado: (travado: boolean) => void;
};

export const useAuthStore = create<EstadoAuth>((set) => ({
  sessao: null,
  perfil: null,
  hidratando: true,
  travado: false,

  definirSessao: (sessao) => set({ sessao }),
  definirPerfil: (perfil) => set({ perfil }),
  concluirHidratacao: () => set({ hidratando: false }),
  definirTravado: (travado) => set({ travado }),
}));
