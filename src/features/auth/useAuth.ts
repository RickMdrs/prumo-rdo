import { useCallback, useEffect } from 'react';

import { traduzirErro } from '@/lib/erros';
import { supabase } from '@/lib/supabase';
import { biometriaAtiva, biometriaDisponivel } from './biometria';
import { useAuthStore, type Perfil } from './store';

async function carregarPerfil(usuarioId: string): Promise<Perfil | null> {
  const { data, error } = await supabase.from('perfis').select('*').eq('id', usuarioId).single();
  if (error) return null;
  return data;
}

/**
 * Liga o estado local ao Supabase Auth. Deve ser chamado uma única vez, no
 * layout raiz.
 */
export function useHidratarSessao() {
  const { definirSessao, definirPerfil, concluirHidratacao, definirTravado } = useAuthStore();

  useEffect(() => {
    let vivo = true;

    async function iniciar() {
      const { data } = await supabase.auth.getSession();
      if (!vivo) return;

      definirSessao(data.session);

      if (data.session) {
        const perfil = await carregarPerfil(data.session.user.id);
        if (!vivo) return;
        definirPerfil(perfil);

        // Só trava se o usuário pediu e o aparelho realmente consegue.
        const [ativa, disponivel] = await Promise.all([biometriaAtiva(), biometriaDisponivel()]);
        if (vivo) definirTravado(ativa && disponivel);
      }

      if (vivo) concluirHidratacao();
    }

    void iniciar();

    const { data: assinatura } = supabase.auth.onAuthStateChange((evento, sessao) => {
      definirSessao(sessao);

      if (!sessao) {
        definirPerfil(null);
        definirTravado(false);
        return;
      }

      // TOKEN_REFRESHED não muda quem é o usuário; recarregar o perfil aqui
      // dispararia uma consulta a cada renovação de token.
      if (evento === 'SIGNED_IN' || evento === 'USER_UPDATED') {
        void carregarPerfil(sessao.user.id).then(definirPerfil);
      }
    });

    return () => {
      vivo = false;
      assinatura.subscription.unsubscribe();
    };
  }, [definirSessao, definirPerfil, concluirHidratacao, definirTravado]);
}

export function useAuth() {
  const sessao = useAuthStore((e) => e.sessao);
  const perfil = useAuthStore((e) => e.perfil);
  const hidratando = useAuthStore((e) => e.hidratando);
  const travado = useAuthStore((e) => e.travado);
  const definirTravado = useAuthStore((e) => e.definirTravado);
  const definirPerfil = useAuthStore((e) => e.definirPerfil);

  const entrar = useCallback(async (email: string, senha: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password: senha,
    });
    if (error) throw new Error(traduzirErro(error));
  }, []);

  const sair = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const recuperarSenha = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase());
    if (error) throw new Error(traduzirErro(error));
  }, []);

  /** Reconfirmação de senha antes de assinar (usada na Parte 8). */
  const confirmarSenha = useCallback(
    async (senha: string) => {
      if (!sessao?.user.email) return false;
      const { error } = await supabase.auth.signInWithPassword({
        email: sessao.user.email,
        password: senha,
      });
      return !error;
    },
    [sessao],
  );

  const recarregarPerfil = useCallback(async () => {
    if (!sessao) return;
    definirPerfil(await carregarPerfil(sessao.user.id));
  }, [sessao, definirPerfil]);

  return {
    sessao,
    perfil,
    papel: perfil?.papel ?? null,
    hidratando,
    travado,
    definirTravado,
    entrar,
    sair,
    recuperarSenha,
    confirmarSenha,
    recarregarPerfil,
  };
}
