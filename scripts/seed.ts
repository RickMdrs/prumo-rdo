/**
 * Popula o banco com o cenário da demonstração.
 *
 *   npm run db:seed
 *
 * Roda no PC, nunca no app: usa SUPABASE_SERVICE_ROLE_KEY de .env.local para
 * criar os usuários no Auth, e a conexão direta do Postgres para os dados.
 *
 * É idempotente — rodar duas vezes não duplica nada.
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { Client } from 'pg';

import {
  DECLARACAO_CLIENTE_COM_RESSALVA,
  DECLARACAO_MASTER,
} from '../src/features/fluxo/declaracoes';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DB_URL = process.env.SUPABASE_DB_URL;
const SENHA = process.env.SENHA_DEMO ?? 'prumo2026';

const USUARIOS = [
  { email: 'master@prumo.dev', nome: 'Eng. Henrique Medeiros', papel: 'master' },
  { email: 'operacional@prumo.dev', nome: 'Carlos Andrade', papel: 'operacional' },
  { email: 'cliente@prumo.dev', nome: 'Marina Costa (Contratante)', papel: 'cliente' },
] as const;

function exigir(valor: string | undefined, nome: string): string {
  if (!valor) {
    console.error(`\n${nome} não está definida em .env.local.\n`);
    process.exit(1);
  }
  return valor;
}

/** Data a N dias atrás, no formato YYYY-MM-DD do fuso da obra. */
function diasAtras(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

async function garantirUsuarios(): Promise<Map<string, string>> {
  const admin = createClient(
    exigir(URL, 'EXPO_PUBLIC_SUPABASE_URL'),
    exigir(SERVICE_ROLE, 'SUPABASE_SERVICE_ROLE_KEY'),
    {
      auth: { autoRefreshToken: false, persistSession: false },
    },
  );

  const { data: existentes, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;

  const ids = new Map<string, string>();

  for (const usuario of USUARIOS) {
    const achado = existentes.users.find((u) => u.email === usuario.email);

    if (achado) {
      // Garante que a senha é a da demonstração, mesmo se alguém trocou antes.
      await admin.auth.admin.updateUserById(achado.id, { password: SENHA });
      ids.set(usuario.email, achado.id);
      console.log(`  ${usuario.email} — já existia`);
      continue;
    }

    const { data, error: erroCriacao } = await admin.auth.admin.createUser({
      email: usuario.email,
      password: SENHA,
      email_confirm: true,
    });
    if (erroCriacao) throw erroCriacao;

    ids.set(usuario.email, data.user.id);
    console.log(`  ${usuario.email} — criado`);
  }

  return ids;
}

async function main() {
  console.log('Usuários no Auth:');
  const ids = await garantirUsuarios();

  const idMaster = ids.get('master@prumo.dev')!;
  const idOper = ids.get('operacional@prumo.dev')!;
  const idCliente = ids.get('cliente@prumo.dev')!;

  const db = new Client({
    connectionString: exigir(DB_URL, 'SUPABASE_DB_URL'),
    ssl: { rejectUnauthorized: false },
  });
  await db.connect();

  try {
    await db.query('begin');

    // Empresa ----------------------------------------------------------------
    const { rows: empresaRows } = await db.query<{ id: string }>(
      `insert into empresas (razao_social, cnpj)
       values ('PLANENGEN Consultoria e Construção LTDA', '12.345.678/0001-90')
       on conflict (cnpj) do update set razao_social = excluded.razao_social
       returning id;`,
    );
    const empresaId = empresaRows[0]!.id;

    // Perfis -----------------------------------------------------------------
    for (const usuario of USUARIOS) {
      await db.query(
        `insert into perfis (id, empresa_id, nome, email, papel)
         values ($1, $2, $3, $4, $5::papel_usuario)
         on conflict (id) do update
           set nome = excluded.nome, papel = excluded.papel, ativo = true;`,
        [ids.get(usuario.email), empresaId, usuario.nome, usuario.email, usuario.papel],
      );
    }

    // Obras ------------------------------------------------------------------
    async function garantirObra(nome: string, dados: Record<string, string>) {
      const { rows } = await db.query<{ id: string }>(
        `select id from obras where empresa_id = $1 and nome = $2;`,
        [empresaId, nome],
      );
      if (rows[0]) return rows[0].id;

      const { rows: novas } = await db.query<{ id: string }>(
        `insert into obras (empresa_id, nome, endereco, contrato, cliente_nome, inicio, fim_previsto)
         values ($1, $2, $3, $4, $5, $6, $7) returning id;`,
        [
          empresaId,
          nome,
          dados.endereco,
          dados.contrato,
          dados.cliente_nome,
          dados.inicio,
          dados.fim_previsto,
        ],
      );
      return novas[0]!.id;
    }

    const alfaId = await garantirObra('Residencial Alfa — Bloco A', {
      endereco: 'Av. dos Holandeses, 1200 — Calhau, São Luís/MA',
      contrato: 'CT-2026-014',
      cliente_nome: 'Alfa Empreendimentos Imobiliários LTDA',
      inicio: diasAtras(180),
      fim_previsto: diasAtras(-240),
    });

    const betaId = await garantirObra('Terminal Beta — Pátio 2', {
      endereco: 'Rod. MA-203, km 8 — Distrito Industrial, São Luís/MA',
      contrato: 'CT-2026-021',
      cliente_nome: 'Beta Logística Portuária S.A.',
      inicio: diasAtras(90),
      fim_previsto: diasAtras(-150),
    });

    // Membros ----------------------------------------------------------------
    // O operacional entra só na Alfa. A Beta existe para provar, na tela, que
    // a RLS esconde obra não vinculada (é o T01 dos testes de violação).
    const vinculos: [string, string, string][] = [
      [alfaId, idMaster, 'master'],
      [alfaId, idOper, 'operacional'],
      [alfaId, idCliente, 'cliente'],
      [betaId, idMaster, 'master'],
      [betaId, idCliente, 'cliente'],
    ];

    for (const [obraId, usuarioId, papel] of vinculos) {
      await db.query(
        `insert into obra_membros (obra_id, usuario_id, papel)
         values ($1, $2, $3::papel_usuario)
         on conflict (obra_id, usuario_id) do update set papel = excluded.papel;`,
        [obraId, usuarioId, papel],
      );
    }

    console.log('\nObras e vínculos prontos.');

    // RDOs -------------------------------------------------------------------
    type Conteudo = {
      clima: [string, string, number, boolean, number | null, string | null][];
      maoObra: [string, string, number, number][];
      equipamentos: [string, string, number, number, number, string | null, string | null][];
      atividades: [string, string, string, string, number, number, string][];
      ocorrencias: [string, string, string, string][];
      pendencias: [string, string, string, string][];
    };

    async function criarRdo(
      obraId: string,
      numero: number,
      data: string,
      conteudo: Conteudo,
      finalizar: (rdoId: string) => Promise<void>,
    ) {
      const { rows: existe } = await db.query<{ id: string }>(
        `select id from rdos where obra_id = $1 and numero = $2;`,
        [obraId, numero],
      );
      if (existe[0]) {
        console.log(`  RDO n. ${numero} — já existia`);
        return;
      }

      // Nasce em rascunho de propósito: os triggers só liberam a escrita das
      // tabelas filhas enquanto o RDO pai está em rascunho.
      const { rows } = await db.query<{ id: string }>(
        `insert into rdos (empresa_id, obra_id, numero, data, turno, autor_id, declaracao_aceita)
         values ($1, $2, $3, $4, 'integral', $5, true) returning id;`,
        [empresaId, obraId, numero, data, idOper],
      );
      const rdoId = rows[0]!.id;

      for (const [periodo, condicao, temp, choveu, duracao, impacto] of conteudo.clima) {
        await db.query(
          `insert into rdo_clima (rdo_id, periodo, condicao, temperatura_c, choveu,
                                  chuva_duracao_min, chuva_impacto)
           values ($1, $2, $3::condicao_tempo, $4, $5, $6, $7);`,
          [rdoId, periodo, condicao, temp, choveu, duracao, impacto],
        );
      }

      for (const [equipe, funcao, quantidade, horas] of conteudo.maoObra) {
        await db.query(
          `insert into rdo_mao_obra (rdo_id, equipe, funcao, quantidade, horas)
           values ($1, $2, $3, $4, $5);`,
          [rdoId, equipe, funcao, quantidade, horas],
        );
      }

      for (const [tipo, ident, qtd, prod, parada, motivo, operador] of conteudo.equipamentos) {
        await db.query(
          `insert into rdo_equipamentos (rdo_id, tipo, identificacao, quantidade,
                                         horas_produtivas, horas_paradas, motivo_parada, operador)
           values ($1, $2, $3, $4, $5, $6, $7, $8);`,
          [rdoId, tipo, ident, qtd, prod, parada, motivo, operador],
        );
      }

      for (const [local, servico, descricao, unidade, qtd, pct, situacao] of conteudo.atividades) {
        await db.query(
          `insert into rdo_atividades (rdo_id, local, servico, descricao, unidade,
                                       quantidade_dia, percentual, situacao)
           values ($1, $2, $3, $4, $5, $6, $7, $8);`,
          [rdoId, local, servico, descricao, unidade, qtd, pct, situacao],
        );
      }

      for (const [descricao, impacto, acao, responsavel] of conteudo.ocorrencias) {
        await db.query(
          `insert into rdo_ocorrencias (rdo_id, descricao, horario, impacto, acao_imediata, responsavel)
           values ($1, $2, now(), $3, $4, $5);`,
          [rdoId, descricao, impacto, acao, responsavel],
        );
      }

      for (const [descricao, responsavel, prazo, criticidade] of conteudo.pendencias) {
        await db.query(
          `insert into rdo_pendencias (rdo_id, descricao, responsavel, prazo, criticidade)
           values ($1, $2, $3, $4, $5);`,
          [rdoId, descricao, responsavel, prazo, criticidade],
        );
      }

      await finalizar(rdoId);
      console.log(`  RDO n. ${numero} — criado`);
    }

    const conteudoPadrao = (variacao: number): Conteudo => ({
      clima: [
        ['manha', 'sol', 29 + variacao, false, null, null],
        [
          'tarde',
          'chuva_fraca',
          27 + variacao,
          true,
          45,
          'Concretagem interrompida por 45 minutos',
        ],
        ['noite', 'nublado', 25 + variacao, false, null, null],
      ],
      maoObra: [
        ['Equipe A', 'Pedreiro', 6, 8],
        ['Equipe A', 'Servente', 4, 8],
        ['Equipe B', 'Carpinteiro', 2, 8],
        ['Equipe B', 'Armador', 3, 8],
        ['Apoio', 'Encarregado', 1, 8],
      ],
      equipamentos: [
        ['Betoneira', 'BET-02', 1, 6.5, 1.5, 'Manutenção corretiva na correia', 'José Ribamar'],
        ['Retroescavadeira', 'RET-01', 1, 7, 0, null, 'Antônio Silva'],
        ['Vibrador de imersão', 'VIB-03', 2, 5, 0, null, null],
      ],
      atividades: [
        [
          'Bloco A — Pavimento 3',
          'Alvenaria de vedação',
          'Elevação de paredes internas em bloco cerâmico',
          'm²',
          48 + variacao * 4,
          62 + variacao * 5,
          'Em andamento',
        ],
        [
          'Bloco A — Pavimento 2',
          'Contrapiso',
          'Execução de contrapiso nas áreas molhadas',
          'm²',
          32,
          80,
          'Em andamento',
        ],
        [
          'Bloco A — Térreo',
          'Instalações hidráulicas',
          'Prumadas de água fria',
          'm',
          24,
          45,
          'Em andamento',
        ],
      ],
      ocorrencias: [
        [
          'Chuva no início da tarde interrompeu a concretagem do pavimento 3',
          'Atraso de aproximadamente 45 minutos na frente de serviço',
          'Equipe remanejada para alvenaria interna até a chuva cessar',
          'Carlos Andrade',
        ],
      ],
      pendencias: [
        [
          'Liberar projeto revisado das instalações elétricas do pavimento 3',
          'Projetista — Escritório Lumen',
          diasAtras(-7),
          'Alta',
        ],
      ],
    });

    console.log('\nRDOs da Obra Alfa:');

    // n. 1 — finalizado, com as duas assinaturas e a ressalva do cliente.
    await criarRdo(alfaId, 1, diasAtras(5), conteudoPadrao(0), async (rdoId) => {
      await db.query(
        `update rdos set status = 'submetido', submetido_em = now() - interval '5 days'
         where id = $1;`,
        [rdoId],
      );
      await db.query(
        `insert into assinaturas (rdo_id, usuario_id, tipo, versao, declaracao_texto, dispositivo)
         values ($1, $2, 'validacao_master', 1, $3, 'Seed da demonstração');`,
        [rdoId, idMaster, DECLARACAO_MASTER],
      );
      await db.query(
        `update rdos set status = 'enviado_cliente', validado_em = now() - interval '5 days'
         where id = $1;`,
        [rdoId],
      );
      await db.query(
        `insert into assinaturas (rdo_id, usuario_id, tipo, ressalva, versao, declaracao_texto, dispositivo)
         values ($1, $2, 'ciencia_cliente_com_ressalva', $3, 1, $4, 'Seed da demonstração');`,
        [
          rdoId,
          idCliente,
          'O quantitativo de alvenaria do pavimento 3 diverge do medido pela fiscalização em 4 m².',
          DECLARACAO_CLIENTE_COM_RESSALVA,
        ],
      );
      await db.query(
        `insert into rdo_versoes (rdo_id, versao, snapshot) values ($1, 1, fn_rdo_snapshot($1))
         on conflict do nothing;`,
        [rdoId],
      );
      await db.query(
        `update rdos set status = 'finalizado', finalizado_em = now() - interval '4 days'
         where id = $1;`,
        [rdoId],
      );
    });

    // n. 2 — validado pelo Master, parado esperando o Cliente.
    await criarRdo(alfaId, 2, diasAtras(3), conteudoPadrao(1), async (rdoId) => {
      await db.query(
        `update rdos set status = 'submetido', submetido_em = now() - interval '3 days'
         where id = $1;`,
        [rdoId],
      );
      await db.query(
        `insert into assinaturas (rdo_id, usuario_id, tipo, versao, declaracao_texto, dispositivo)
         values ($1, $2, 'validacao_master', 1, $3, 'Seed da demonstração');`,
        [rdoId, idMaster, DECLARACAO_MASTER],
      );
      await db.query(
        `update rdos set status = 'enviado_cliente', validado_em = now() - interval '3 days'
         where id = $1;`,
        [rdoId],
      );
      await db.query(
        `insert into rdo_versoes (rdo_id, versao, snapshot) values ($1, 1, fn_rdo_snapshot($1))
         on conflict do nothing;`,
        [rdoId],
      );
      await db.query(
        `insert into notificacoes (usuario_id, rdo_id, tipo, titulo, corpo)
         values ($1, $2, 'rdo_para_ciencia', 'RDO n. 2 aguardando sua ciência',
                 'O RDO foi validado pelo responsável técnico e está disponível.');`,
        [idCliente, rdoId],
      );
    });

    // n. 3 — devolvido: volta a rascunho, mas com o motivo preenchido.
    await criarRdo(alfaId, 3, diasAtras(1), conteudoPadrao(2), async (rdoId) => {
      await db.query(
        `update rdos set status = 'submetido', submetido_em = now() - interval '1 day'
         where id = $1;`,
        [rdoId],
      );
      await db.query(
        `insert into comentarios (rdo_id, autor_id, alvo_tipo, texto)
         values ($1, $2, 'rdo', $3);`,
        [
          rdoId,
          idMaster,
          'A ocorrência de chuva não bate com as horas paralisadas lançadas nos equipamentos. Revise antes de reenviar.',
        ],
      );
      await db.query(
        `update rdos set status = 'rascunho', submetido_em = null, devolucao_motivo = $2
         where id = $1;`,
        [
          rdoId,
          'Horas paralisadas dos equipamentos inconsistentes com a duração da chuva registrada no clima.',
        ],
      );
      await db.query(
        `insert into notificacoes (usuario_id, rdo_id, tipo, titulo, corpo)
         values ($1, $2, 'rdo_devolvido', 'RDO n. 3 devolvido para correção',
                 'Horas paralisadas inconsistentes com a duração da chuva.');`,
        [idOper, rdoId],
      );
    });

    // RDO da Obra Beta: existe para o operacional NÃO ver. É o T01 na tela.
    console.log('\nRDO da Obra Beta (invisível para o operacional):');
    await criarRdo(betaId, 1, diasAtras(2), conteudoPadrao(3), async (rdoId) => {
      await db.query(`update rdos set autor_id = $2 where id = $1;`, [rdoId, idMaster]);
      await db.query(
        `update rdos set status = 'submetido', submetido_em = now() - interval '2 days'
         where id = $1;`,
        [rdoId],
      );
    });

    await db.query('commit');

    // Resumo -----------------------------------------------------------------
    const { rows: resumo } = await db.query<{ obra: string; status: string; total: string }>(
      `select o.nome as obra, r.status::text as status, count(*)::text as total
       from rdos r join obras o on o.id = r.obra_id
       group by o.nome, r.status order by o.nome, r.status;`,
    );

    console.log('\n' + '='.repeat(60));
    console.log('Cenário pronto.');
    console.log('='.repeat(60));
    for (const linha of resumo) {
      console.log(`  ${linha.obra} — ${linha.status}: ${linha.total}`);
    }
    console.log('\nLogins (senha para os três):', SENHA);
    for (const u of USUARIOS) console.log(`  ${u.email} — ${u.papel}`);
  } catch (erro) {
    await db.query('rollback');
    throw erro;
  } finally {
    await db.end();
  }
}

main().catch((erro: unknown) => {
  console.error('\n' + (erro instanceof Error ? erro.message : String(erro)));
  process.exit(1);
});
