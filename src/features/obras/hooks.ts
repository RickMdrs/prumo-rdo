import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  atualizarObra,
  buscarObra,
  criarObra,
  definirObraAtiva,
  desvincularMembro,
  listarMembros,
  listarObras,
  listarPerfisDaEmpresa,
  listarRdosDaObra,
  vincularMembro,
  type DadosObra,
  type Papel,
} from './api';

export const chaves = {
  obras: ['obras'] as const,
  obra: (id: string) => ['obras', id] as const,
  membros: (id: string) => ['obras', id, 'membros'] as const,
  rdos: (id: string) => ['obras', id, 'rdos'] as const,
  perfisDaEmpresa: ['perfis', 'empresa'] as const,
};

export function useObras() {
  return useQuery({ queryKey: chaves.obras, queryFn: listarObras });
}

export function useObra(id: string) {
  return useQuery({
    queryKey: chaves.obra(id),
    queryFn: () => buscarObra(id),
    enabled: Boolean(id),
  });
}

export function useMembros(obraId: string) {
  return useQuery({
    queryKey: chaves.membros(obraId),
    queryFn: () => listarMembros(obraId),
    enabled: Boolean(obraId),
  });
}

export function useRdosDaObra(obraId: string) {
  return useQuery({
    queryKey: chaves.rdos(obraId),
    queryFn: () => listarRdosDaObra(obraId),
    enabled: Boolean(obraId),
  });
}

export function usePerfisDaEmpresa() {
  return useQuery({ queryKey: chaves.perfisDaEmpresa, queryFn: listarPerfisDaEmpresa });
}

export function useCriarObra() {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: (dados: DadosObra) => criarObra(dados),
    onSuccess: () => cliente.invalidateQueries({ queryKey: chaves.obras }),
  });
}

export function useAtualizarObra(id: string) {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: (dados: DadosObra) => atualizarObra(id, dados),
    onSuccess: async () => {
      await cliente.invalidateQueries({ queryKey: chaves.obras });
      await cliente.invalidateQueries({ queryKey: chaves.obra(id) });
    },
  });
}

export function useDefinirObraAtiva(id: string) {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: (ativa: boolean) => definirObraAtiva(id, ativa),
    onSuccess: async () => {
      await cliente.invalidateQueries({ queryKey: chaves.obras });
      await cliente.invalidateQueries({ queryKey: chaves.obra(id) });
    },
  });
}

export function useVincularMembro(obraId: string) {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: ({ usuarioId, papel }: { usuarioId: string; papel: Papel }) =>
      vincularMembro(obraId, usuarioId, papel),
    onSuccess: () => cliente.invalidateQueries({ queryKey: chaves.membros(obraId) }),
  });
}

export function useDesvincularMembro(obraId: string) {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: (usuarioId: string) => desvincularMembro(obraId, usuarioId),
    onSuccess: () => cliente.invalidateQueries({ queryKey: chaves.membros(obraId) }),
  });
}
