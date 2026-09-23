/**
 * Traduz erros do Supabase e do Postgres para português.
 *
 * As funções da camada 005 levantam as mensagens já em português, então o que
 * chega de lá passa direto. O que precisa de tradução são os erros de
 * infraestrutura (Auth, rede) e os códigos crus do Postgres.
 */

const AUTH: Record<string, string> = {
  'Invalid login credentials': 'E-mail ou senha incorretos.',
  'Email not confirmed': 'Este e-mail ainda não foi confirmado.',
  'User already registered': 'Já existe uma conta com este e-mail.',
  'Password should be at least 6 characters.': 'A senha precisa ter pelo menos 6 caracteres.',
  'Email rate limit exceeded': 'Muitas tentativas. Aguarde alguns minutos.',
  'For security purposes, you can only request this after 60 seconds.':
    'Por segurança, aguarde 60 segundos antes de tentar de novo.',
};

const POSTGRES: Record<string, string> = {
  '23505': 'Já existe um registro com esses dados.',
  '23503': 'Este registro depende de outro que não existe.',
  '23514': 'Os dados informados não atendem a uma regra do sistema.',
  '42501': 'Você não tem permissão para esta operação.',
  PGRST116: 'Registro não encontrado ou fora do seu acesso.',
};

function pareceDeRede(texto: string): boolean {
  const t = texto.toLowerCase();
  return (
    t.includes('network request failed') ||
    t.includes('failed to fetch') ||
    t.includes('econnrefused') ||
    t.includes('timeout')
  );
}

export function traduzirErro(erro: unknown): string {
  if (!erro) return 'Ocorreu um erro inesperado.';

  const objeto = erro as { message?: string; code?: string; hint?: string };
  const mensagem = objeto.message ?? String(erro);

  if (pareceDeRede(mensagem)) {
    return 'Sem conexão com o servidor. Verifique a internet e tente de novo.';
  }

  const traducaoAuth = AUTH[mensagem];
  if (traducaoAuth) return traducaoAuth;

  if (objeto.code) {
    const traducaoPg = POSTGRES[objeto.code];
    if (traducaoPg) return traducaoPg;
  }

  // P0001 é o código que as funções e triggers do projeto usam: a mensagem já
  // vem escrita em português e pensada para o usuário final.
  if (objeto.code === 'P0001' || /[áâãéêíóôõúç]/i.test(mensagem)) {
    return objeto.hint ? `${mensagem}\n\n${objeto.hint}` : mensagem;
  }

  return mensagem;
}
