/**
 * Só chaves públicas entram no bundle. A `service_role` nunca passa por aqui —
 * ela vive apenas no `.env.local` do script de seed, fora do app.
 */
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

function exigir(valor: string | undefined, nome: string): string {
  if (!valor) {
    throw new Error(
      `Variável de ambiente ausente: ${nome}. Copie .env.example para .env e preencha antes de iniciar o app.`,
    );
  }
  return valor;
}

export const env = {
  supabaseUrl: exigir(supabaseUrl, 'EXPO_PUBLIC_SUPABASE_URL'),
  supabaseAnonKey: exigir(supabaseAnonKey, 'EXPO_PUBLIC_SUPABASE_ANON_KEY'),
};
