import type { RascunhoRdo } from '../tipos';

export type PropsEtapa = {
  r: RascunhoRdo;
  atualizar: (mudar: (r: RascunhoRdo) => RascunhoRdo) => void;
};

/** Troca um item de uma lista pelo id, aplicando só os campos alterados. */
export function trocar<T extends { id: string }>(lista: T[], id: string, parcial: Partial<T>): T[] {
  return lista.map((item) => (item.id === id ? { ...item, ...parcial } : item));
}

export function tirar<T extends { id: string }>(lista: T[], id: string): T[] {
  return lista.filter((item) => item.id !== id);
}
