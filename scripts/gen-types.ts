/**
 * Gera src/types/database.ts a partir do catálogo do Postgres.
 *
 * Existe porque `supabase gen types` exige Docker, que não é pré-requisito
 * deste projeto. Lê pg_catalog pela mesma conexão das migrações.
 *
 *   npm run db:types
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

import dotenv from 'dotenv';
import { Client } from 'pg';

dotenv.config({ path: '.env.local' });

const SAIDA = join(process.cwd(), 'src', 'types', 'database.ts');

type Coluna = {
  tabela: string;
  coluna: string;
  tipo: string;
  nao_nulo: boolean;
  tem_default: boolean;
};

type Enum = { nome: string; valores: string[] };

type Funcao = { nome: string; args: string; retorno: string };

type Relacao = {
  nome: string;
  tabela: string;
  colunas: string[];
  tabela_alvo: string;
  colunas_alvo: string[];
  um_para_um: boolean;
};

const ESCALARES: Record<string, string> = {
  uuid: 'string',
  text: 'string',
  citext: 'string',
  name: 'string',
  bpchar: 'string',
  date: 'string',
  time: 'string',
  timetz: 'string',
  timestamp: 'string',
  timestamptz: 'string',
  interval: 'string',
  bytea: 'string',
  bool: 'boolean',
  boolean: 'boolean',
  int2: 'number',
  int4: 'number',
  int8: 'number',
  smallint: 'number',
  integer: 'number',
  bigint: 'number',
  real: 'number',
  numeric: 'number',
  float4: 'number',
  float8: 'number',
  'double precision': 'number',
  json: 'Json',
  jsonb: 'Json',
  void: 'undefined',
  record: 'Json',
};

function limpar(tipo: string): string {
  return tipo
    .replace(/^"(.*)"$/, '$1')
    .replace(/\(.*\)$/, '')
    .replace(/^public\./, '')
    .trim();
}

function mapear(tipoBruto: string, enums: Enum[]): string {
  let tipo = limpar(tipoBruto);

  let arranjo = false;
  if (tipo.endsWith('[]')) {
    arranjo = true;
    tipo = tipo.slice(0, -2).trim();
  }
  if (tipo.startsWith('SETOF ')) {
    arranjo = true;
    tipo = tipo.slice(6).trim();
  }

  tipo = limpar(tipo);

  const escalar = ESCALARES[tipo];
  let ts: string;

  if (tipo.startsWith('character varying') || tipo.startsWith('character')) {
    ts = 'string';
  } else if (tipo.startsWith('timestamp')) {
    ts = 'string';
  } else if (escalar) {
    ts = escalar;
  } else if (enums.some((e) => e.nome === tipo)) {
    ts = `Database['public']['Enums']['${tipo}']`;
  } else {
    ts = 'unknown';
  }

  return arranjo ? `${ts}[]` : ts;
}

function mapearRetorno(retorno: string, enums: Enum[], tabelas: Set<string>): string {
  const bruto = retorno.trim();

  // RETURNS TABLE(col tipo, ...) vira uma lista de objetos com essas colunas.
  const tabela = /^TABLE\((.*)\)$/is.exec(bruto);
  if (tabela) {
    const colunas = parsearArgs(tabela[1]!);
    return `{ ${colunas.map((c) => `${c.nome}: ${mapear(c.tipo, enums)}`).join('; ')} }[]`;
  }

  const semSetof = bruto.replace(/^SETOF\s+/i, '').trim();
  const eLista = /^SETOF\s+/i.test(bruto);
  const nome = limpar(semSetof);

  if (tabelas.has(nome)) {
    const t = `Database['public']['Tables']['${nome}']['Row']`;
    return eLista ? `${t}[]` : t;
  }

  return mapear(bruto, enums);
}

/** "p_rdo_id uuid, p_motivo text DEFAULT NULL::text" -> pares nome/tipo */
function parsearArgs(args: string): { nome: string; tipo: string; opcional: boolean }[] {
  if (!args.trim()) return [];

  const partes: string[] = [];
  let nivel = 0;
  let atual = '';

  for (const ch of args) {
    if (ch === '(') nivel += 1;
    if (ch === ')') nivel -= 1;
    if (ch === ',' && nivel === 0) {
      partes.push(atual);
      atual = '';
      continue;
    }
    atual += ch;
  }
  if (atual.trim()) partes.push(atual);

  return partes.flatMap((parte) => {
    const texto = parte.trim();
    if (!texto) return [];

    const opcional = / DEFAULT /i.test(texto);
    const semDefault = texto.split(/ DEFAULT /i)[0]!.trim();
    const semModo = semDefault.replace(/^(IN|OUT|INOUT|VARIADIC)\s+/i, '');

    const espaco = semModo.indexOf(' ');
    if (espaco === -1) return [];

    return [
      {
        nome: semModo.slice(0, espaco).trim(),
        tipo: semModo.slice(espaco + 1).trim(),
        opcional,
      },
    ];
  });
}

async function main() {
  const url = process.env.SUPABASE_DB_URL?.trim();
  if (!url) {
    console.error('SUPABASE_DB_URL não definida em .env.local');
    process.exit(1);
  }

  const cliente = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await cliente.connect();

  const { rows: enums } = await cliente.query<Enum>(`
    select t.typname as nome,
           array_agg(e.enumlabel::text order by e.enumsortorder) as valores
    from pg_type t
    join pg_enum e on e.enumtypid = t.oid
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
    group by t.typname
    order by t.typname;
  `);

  const { rows: colunas } = await cliente.query<Coluna>(`
    select c.relname as tabela,
           a.attname as coluna,
           format_type(a.atttypid, a.atttypmod) as tipo,
           a.attnotnull as nao_nulo,
           (pg_get_expr(d.adbin, d.adrelid) is not null or a.attidentity <> '') as tem_default
    from pg_attribute a
    join pg_class c on c.oid = a.attrelid
    join pg_namespace n on n.oid = c.relnamespace
    left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
    where n.nspname = 'public'
      and c.relkind in ('r', 'v')
      and a.attnum > 0
      and not a.attisdropped
      and c.relname not like '\\_%'
    order by c.relname, a.attnum;
  `);

  // As relações alimentam o Relationships de cada tabela: é o que permite ao
  // supabase-js tipar as consultas com join, tipo select('*, perfis(*)').
  const { rows: relacoes } = await cliente.query<Relacao>(`
    select
      c.conname as nome,
      src.relname as tabela,
      tgt.relname as tabela_alvo,
      (select array_agg(a.attname::text order by k.ord)
         from unnest(c.conkey) with ordinality as k(attnum, ord)
         join pg_attribute a on a.attrelid = c.conrelid and a.attnum = k.attnum) as colunas,
      (select array_agg(a.attname::text order by k.ord)
         from unnest(c.confkey) with ordinality as k(attnum, ord)
         join pg_attribute a on a.attrelid = c.confrelid and a.attnum = k.attnum) as colunas_alvo,
      exists (
        select 1 from pg_index i
        where i.indrelid = c.conrelid
          and i.indisunique
          and i.indnatts = array_length(c.conkey, 1)
          and i.indkey::int2[] @> c.conkey
          and c.conkey @> i.indkey::int2[]
      ) as um_para_um
    from pg_constraint c
    join pg_class src on src.oid = c.conrelid
    join pg_class tgt on tgt.oid = c.confrelid
    join pg_namespace n on n.oid = src.relnamespace
    join pg_namespace na on na.oid = tgt.relnamespace
    where c.contype = 'f'
      and n.nspname = 'public'
      and na.nspname = 'public'
    order by src.relname, c.conname;
  `);

  const { rows: funcoes } = await cliente.query<Funcao>(`
    select p.proname as nome,
           pg_get_function_arguments(p.oid) as args,
           pg_get_function_result(p.oid) as retorno
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prokind = 'f'
    order by p.proname;
  `);

  await cliente.end();

  const porTabela = new Map<string, Coluna[]>();
  for (const c of colunas) {
    const lista = porTabela.get(c.tabela) ?? [];
    lista.push(c);
    porTabela.set(c.tabela, lista);
  }

  const nomesTabelas = new Set(porTabela.keys());

  const linhas: string[] = [
    '// GERADO AUTOMATICAMENTE POR scripts/gen-types.ts — NÃO EDITE À MÃO.',
    '// Para atualizar depois de uma migração: npm run db:types',
    '',
    'export type Json =',
    '  | string',
    '  | number',
    '  | boolean',
    '  | null',
    '  | { [key: string]: Json | undefined }',
    '  | Json[];',
    '',
    'export type Database = {',
    '  public: {',
    '    Tables: {',
  ];

  for (const [tabela, cols] of [...porTabela.entries()].sort()) {
    linhas.push(`      ${tabela}: {`);

    linhas.push('        Row: {');
    for (const c of cols) {
      linhas.push(`          ${c.coluna}: ${mapear(c.tipo, enums)}${c.nao_nulo ? '' : ' | null'};`);
    }
    linhas.push('        };');

    linhas.push('        Insert: {');
    for (const c of cols) {
      const obrigatorio = c.nao_nulo && !c.tem_default;
      linhas.push(
        `          ${c.coluna}${obrigatorio ? '' : '?'}: ${mapear(c.tipo, enums)}${c.nao_nulo ? '' : ' | null'};`,
      );
    }
    linhas.push('        };');

    linhas.push('        Update: {');
    for (const c of cols) {
      linhas.push(
        `          ${c.coluna}?: ${mapear(c.tipo, enums)}${c.nao_nulo ? '' : ' | null'};`,
      );
    }
    linhas.push('        };');

    const minhasRelacoes = relacoes.filter((r) => r.tabela === tabela);

    if (minhasRelacoes.length === 0) {
      linhas.push('        Relationships: [];');
    } else {
      linhas.push('        Relationships: [');
      for (const r of minhasRelacoes) {
        linhas.push('          {');
        linhas.push(`            foreignKeyName: '${r.nome}';`);
        linhas.push(`            columns: [${r.colunas.map((c) => `'${c}'`).join(', ')}];`);
        linhas.push(`            isOneToOne: ${r.um_para_um};`);
        linhas.push(`            referencedRelation: '${r.tabela_alvo}';`);
        linhas.push(
          `            referencedColumns: [${r.colunas_alvo.map((c) => `'${c}'`).join(', ')}];`,
        );
        linhas.push('          },');
      }
      linhas.push('        ];');
    }

    linhas.push('      };');
  }

  linhas.push('    };');
  linhas.push('    Views: Record<string, never>;');
  linhas.push('    Functions: {');

  for (const f of funcoes) {
    const args = parsearArgs(f.args);
    linhas.push(`      ${f.nome}: {`);

    if (args.length === 0) {
      linhas.push('        Args: Record<string, never>;');
    } else {
      linhas.push('        Args: {');
      for (const a of args) {
        linhas.push(`          ${a.nome}${a.opcional ? '?' : ''}: ${mapear(a.tipo, enums)};`);
      }
      linhas.push('        };');
    }

    linhas.push(`        Returns: ${mapearRetorno(f.retorno, enums, nomesTabelas)};`);
    linhas.push('      };');
  }

  linhas.push('    };');
  linhas.push('    Enums: {');
  for (const e of enums) {
    linhas.push(`      ${e.nome}: ${e.valores.map((v) => `'${v}'`).join(' | ')};`);
  }
  linhas.push('    };');
  linhas.push('    CompositeTypes: Record<string, never>;');
  linhas.push('  };');
  linhas.push('};');
  linhas.push('');
  linhas.push("export type Tabelas<T extends keyof Database['public']['Tables']> =");
  linhas.push("  Database['public']['Tables'][T]['Row'];");
  linhas.push('');
  linhas.push("export type Enums<T extends keyof Database['public']['Enums']> =");
  linhas.push("  Database['public']['Enums'][T];");
  linhas.push('');

  writeFileSync(SAIDA, linhas.join('\n'), 'utf8');

  console.log(
    `src/types/database.ts gerado: ${porTabela.size} tabelas, ${funcoes.length} funções, ${enums.length} enums.`,
  );
}

main().catch((erro: unknown) => {
  console.error(erro instanceof Error ? erro.message : String(erro));
  process.exit(1);
});
