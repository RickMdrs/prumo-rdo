import type { Feather } from '@expo/vector-icons';

import type { Papel } from '@/features/auth/store';

/** Precisa ser literal: o expo-router valida as rotas em tempo de compilação. */
export type HrefAba =
  '/inicio' | '/obras' | '/meus-rdos' | '/novo-rdo' | '/ciencia' | '/notificacoes' | '/perfil';

export type Aba = {
  /** Nome do arquivo de rota dentro de app/(app). */
  rota: string;
  href: HrefAba;
  rotulo: string;
  icone: keyof typeof Feather.glyphMap;
};

/** Todas as rotas declaradas no Tabs, na ordem em que aparecem. */
export const ABAS: Record<string, Aba> = {
  inicio: { rota: 'inicio', href: '/inicio', rotulo: 'Início', icone: 'home' },
  obras: { rota: 'obras', href: '/obras', rotulo: 'Obras', icone: 'layers' },
  'meus-rdos': { rota: 'meus-rdos', href: '/meus-rdos', rotulo: 'Meus RDOs', icone: 'clipboard' },
  'novo-rdo': { rota: 'novo-rdo', href: '/novo-rdo', rotulo: 'Novo RDO', icone: 'plus-circle' },
  ciencia: { rota: 'ciencia', href: '/ciencia', rotulo: 'Ciência', icone: 'check-square' },
  notificacoes: { rota: 'notificacoes', href: '/notificacoes', rotulo: 'Avisos', icone: 'bell' },
  perfil: { rota: 'perfil', href: '/perfil', rotulo: 'Perfil', icone: 'user' },
};

export const ABAS_POR_PAPEL: Record<Papel, string[]> = {
  master: ['inicio', 'obras', 'notificacoes', 'perfil'],
  operacional: ['meus-rdos', 'novo-rdo', 'notificacoes', 'perfil'],
  cliente: ['ciencia', 'notificacoes', 'perfil'],
};

/** Para onde cada papel vai logo depois de entrar. */
export const ROTA_INICIAL: Record<Papel, '/inicio' | '/meus-rdos' | '/ciencia'> = {
  master: '/inicio',
  operacional: '/meus-rdos',
  cliente: '/ciencia',
};

export function abaVisivel(papel: Papel, rota: string): boolean {
  return ABAS_POR_PAPEL[papel].includes(rota);
}
