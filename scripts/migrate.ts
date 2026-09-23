/**
 * Aplica as migrações de supabase/migrations no banco apontado por
 * SUPABASE_DB_URL (lido de .env.local — nunca entra no app).
 *
 *   npm run db:migrate          aplica o que ainda falta
 *   npm run db:migrate -- --reset   apaga tudo e aplica do zero
 *   npm run db:test             roda supabase/tests/violacao.sql
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import dotenv from 'dotenv';
import { Client } from 'pg';

dotenv.config({ path: '.env.local' });

const RAIZ = process.cwd();
const DIR_MIGRACOES = join(RAIZ, 'supabase', 'migrations');
const ARQUIVO_TESTES = join(RAIZ, 'supabase', 'tests', 'violacao.sql');

const BUCKETS = ['rdo-fotos', 'rdo-pdfs'];

const POLITICAS_STORAGE = [
  'rdo_fotos_storage_leitura',
  'rdo_fotos_storage_envio',
  'rdo_fotos_storage_remocao',
  'rdo_pdfs_storage_leitura',
  'rdo_pdfs_storage_envio',
];

function exigirUrl(): string {
  const url = process.env.SUPABASE_DB_URL?.trim();
  if (!url) {
    console.error(
      '\nSUPABASE_DB_URL não está definida em .env.local.\n\n' +
        'Painel do Supabase > Connect > Direct Connection string > aba "Session pooler".\n' +
        'Cole a URI e troque [YOUR-PASSWORD] pela senha do banco.\n',
    );
    process.exit(1);
  }
  if (url.includes('[YOUR-PASSWORD]')) {
    console.error('\nTroque [YOUR-PASSWORD] pela senha real do banco em .env.local.\n');
    process.exit(1);
  }
  return url;
}

function migracoes(): { nome: string; sql: string }[] {
  return readdirSync(DIR_MIGRACOES)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((nome) => ({ nome, sql: readFileSync(join(DIR_MIGRACOES, nome), 'utf8') }));
}

async function zerar(cliente: Client) {
  console.log('Zerando o banco...');

  for (const politica of POLITICAS_STORAGE) {
    await cliente.query(`drop policy if exists ${politica} on storage.objects;`);
  }

  // O Supabase gerenciado bloqueia DELETE direto nas tabelas de storage. Os
  // buckets são recriados com "on conflict do nothing", então deixá-los de pé
  // não atrapalha o reset.
  try {
    await cliente.query(`delete from storage.objects where bucket_id = any($1::text[]);`, [
      BUCKETS,
    ]);
    await cliente.query(`delete from storage.buckets where id = any($1::text[]);`, [BUCKETS]);
  } catch {
    console.log('  (buckets mantidos — o storage gerenciado não permite remoção por SQL)');
  }

  await cliente.query(`
    drop schema if exists public cascade;
    create schema public;
    grant usage on schema public to anon, authenticated, service_role;
    grant all on schema public to postgres, service_role;
  `);

  // Usuários de demonstração e de teste ficam órfãos sem o schema public.
  await cliente.query(
    `delete from auth.users where email like '%@prumo.dev' or email like '%@prumo.test';`,
  );

  console.log('Banco zerado.\n');
}

async function aplicar(cliente: Client) {
  await cliente.query(`
    create table if not exists _migracoes (
      nome text primary key,
      aplicada_em timestamptz not null default now()
    );
  `);

  const { rows } = await cliente.query<{ nome: string }>('select nome from _migracoes;');
  const jaAplicadas = new Set(rows.map((r) => r.nome));

  let aplicadas = 0;

  for (const { nome, sql } of migracoes()) {
    if (jaAplicadas.has(nome)) {
      console.log(`  ${nome} — já aplicada`);
      continue;
    }

    process.stdout.write(`  ${nome} ... `);
    try {
      await cliente.query('begin');
      await cliente.query(sql);
      await cliente.query('insert into _migracoes (nome) values ($1);', [nome]);
      await cliente.query('commit');
      console.log('ok');
      aplicadas += 1;
    } catch (erro) {
      await cliente.query('rollback');
      console.log('FALHOU\n');
      throw erro;
    }
  }

  console.log(
    aplicadas === 0 ? '\nNada a aplicar.' : `\n${aplicadas} migração(ões) aplicada(s) com sucesso.`,
  );
}

async function testar(cliente: Client) {
  console.log('Rodando supabase/tests/violacao.sql\n');

  const resultados = await cliente.query(readFileSync(ARQUIVO_TESTES, 'utf8'));
  const tabela = Array.isArray(resultados) ? resultados : [resultados];
  const comLinhas = tabela.filter((r) => Array.isArray(r.rows) && r.rows.length > 0);
  const final = comLinhas[comLinhas.length - 1];

  if (!final) {
    console.log('Nenhum resultado retornado.');
    return false;
  }

  let tudoPassou = true;

  for (const linha of final.rows as Record<string, string>[]) {
    const ok = linha.veredito === 'PASSOU';
    if (!ok) tudoPassou = false;

    if (linha.caso === 'RESUMO') {
      console.log(`\n${'='.repeat(78)}`);
      console.log(`RESUMO: ${linha.tentativa} — ${linha.veredito}`);
      console.log('='.repeat(78));
      continue;
    }

    console.log(`${ok ? '[PASSOU]' : '[FALHOU]'} ${linha.caso} — ${linha.tentativa}`);
    console.log(`          barrado por : ${linha.barrado_por}`);
    console.log(`          esperado    : ${linha.esperado}`);
    console.log(`          obtido      : ${linha.obtido}`);
    console.log(`          detalhe     : ${linha.detalhe}`);
    console.log('');
  }

  return tudoPassou;
}

async function main() {
  const args = process.argv.slice(2);
  const cliente = new Client({
    connectionString: exigirUrl(),
    ssl: { rejectUnauthorized: false },
  });

  await cliente.connect();

  try {
    if (args.includes('--test')) {
      const passou = await testar(cliente);
      process.exitCode = passou ? 0 : 1;
      return;
    }

    if (args.includes('--reset')) {
      await zerar(cliente);
    }

    console.log('Aplicando migrações:');
    await aplicar(cliente);
  } finally {
    await cliente.end();
  }
}

main().catch((erro: unknown) => {
  console.error('\n' + (erro instanceof Error ? erro.message : String(erro)));
  process.exit(1);
});
