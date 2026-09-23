import { randomUUID } from 'node:crypto';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { Client } from 'pg';

import { montarPayload } from '../src/features/rdo/payload';
import type { RascunhoRdo } from '../src/features/rdo/tipos';
import type { Database } from '../src/types/database';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local' });

const URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const ANON = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
const OBRA = '__teste_fluxo__';

let falhas = 0;
function ok(cond: boolean, msg: string) {
  console.log(`${cond ? '  ok  ' : '  FALHOU'} ${msg}`);
  if (!cond) falhas++;
}

async function logar(email: string): Promise<SupabaseClient<Database>> {
  const sb = createClient<Database>(URL, ANON, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await sb.auth.signInWithPassword({ email, password: 'prumo2026' });
  if (error) throw error;
  return sb;
}

async function main() {
  const db = new Client({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false },
  });
  await db.connect();

  const { rows: u } = await db.query<{ email: string; id: string; empresa_id: string }>(
    `select email, id, empresa_id from perfis where email like '%@prumo.dev'`,
  );
  const id = (e: string) => u.find((x) => x.email === e)!.id;
  const { rows: ob } = await db.query<{ id: string }>(
    `insert into obras (empresa_id, nome) values ($1, $2) returning id`,
    [u[0]!.empresa_id, OBRA],
  );
  const obraId = ob[0]!.id;
  await db.query(
    `insert into obra_membros (obra_id, usuario_id, papel) values
     ($1,$2,'master'),($1,$3,'operacional'),($1,$4,'cliente')`,
    [obraId, id('master@prumo.dev'), id('operacional@prumo.dev'), id('cliente@prumo.dev')],
  );

  const oper = await logar('operacional@prumo.dev');
  const master = await logar('master@prumo.dev');
  const cliente = await logar('cliente@prumo.dev');

  try {
    console.log('\nParte 5 — criação idempotente');
    const rdoId = randomUUID();
    const hoje = new Date().toISOString().slice(0, 10);
    const c1 = await oper.rpc('rdo_criar', {
      p_obra_id: obraId,
      p_data: hoje,
      p_turno: 'integral',
      p_id: rdoId,
    });
    const c2 = await oper.rpc('rdo_criar', {
      p_obra_id: obraId,
      p_data: hoje,
      p_turno: 'integral',
      p_id: rdoId,
    });
    ok(
      !c1.error && c1.data?.numero === 1,
      `primeira chamada cria n. ${c1.data?.numero} ${c1.error?.message ?? ''}`,
    );
    ok(
      !c2.error && c2.data?.id === rdoId && c2.data?.numero === 1,
      'retentativa devolve o mesmo RDO, sem gastar número',
    );

    console.log('\nParte 6 — salvar rascunho com o payload do app');
    const atv = randomUUID();
    const r: RascunhoRdo = {
      id: rdoId,
      obra_id: obraId,
      obra_nome: OBRA,
      numero: 1,
      data: hoje,
      turno: 'integral',
      sem_producao: false,
      sem_producao_justificativa: '',
      declaracao_aceita: false,
      devolucao_motivo: null,
      clima: [
        {
          id: randomUUID(),
          periodo: 'manha',
          condicao: 'sol',
          temperatura_c: 30.5,
          choveu: false,
          chuva_duracao_min: null,
          chuva_impacto: '',
          precipitacao_mm: null,
          horas_paralisadas: null,
        },
        {
          id: randomUUID(),
          periodo: 'tarde',
          condicao: 'chuva_fraca',
          temperatura_c: 27,
          choveu: true,
          chuva_duracao_min: 40,
          chuva_impacto: 'Concretagem parou',
          precipitacao_mm: 3.2,
          horas_paralisadas: 0.7,
        },
      ],
      mao_obra: [
        { id: randomUUID(), equipe: 'A', funcao: 'Pedreiro', quantidade: 8, horas: 8 },
        { id: randomUUID(), equipe: 'A', funcao: 'Servente', quantidade: 4, horas: 8 },
      ],
      equipamentos: [
        {
          id: randomUUID(),
          tipo: 'Betoneira',
          identificacao: 'BET-1',
          quantidade: 1,
          horas_produtivas: 6,
          horas_paradas: 2,
          motivo_parada: 'Correia',
          operador: 'José',
        },
        {
          id: randomUUID(),
          tipo: 'Vibrador',
          identificacao: '',
          quantidade: 2,
          horas_produtivas: 5,
          horas_paradas: 0,
          motivo_parada: '',
          operador: '',
        },
      ],
      atividades: [
        {
          id: atv,
          local: 'Pav. 3',
          servico: 'Alvenaria',
          descricao: '',
          unidade: 'm²',
          quantidade_dia: 42.5,
          percentual: 60,
          situacao: 'Em andamento',
        },
      ],
      ocorrencias: [
        {
          id: randomUUID(),
          descricao: 'Chuva',
          horario: '14:30',
          impacto: 'atraso',
          acao_imediata: '',
          responsavel: 'Carlos',
        },
      ],
      pendencias: [
        {
          id: randomUUID(),
          descricao: 'Projeto elétrico',
          responsavel: 'Projetista',
          prazo: hoje,
          criticidade: 'Alta',
        },
      ],
    };
    const s1 = await oper.rpc('rdo_salvar_rascunho', {
      p_rdo_id: rdoId,
      p_payload: montarPayload(r),
    });
    ok(!s1.error, `rascunho salvo ${s1.error?.message ?? ''}`);
    const { data: mo } = await oper.from('rdo_mao_obra').select('quantidade').eq('rdo_id', rdoId);
    ok(mo?.reduce((s, l) => s + l.quantidade, 0) === 12, '12 trabalhadores gravados');

    const s2 = await oper.rpc('rdo_salvar_rascunho', {
      p_rdo_id: rdoId,
      p_payload: montarPayload(r),
    });
    const { count } = await oper
      .from('rdo_atividades')
      .select('id', { count: 'exact', head: true })
      .eq('rdo_id', rdoId);
    ok(!s2.error && count === 1, 'salvar de novo não duplica linhas (upsert por id)');

    console.log('\nParte 7 — foto no Storage + rdo_fotos');
    const caminho = `${obraId}/${rdoId}/${randomUUID()}.jpg`;
    const up = await oper.storage
      .from('rdo-fotos')
      .upload(caminho, new Uint8Array([255, 216, 255, 217]), { contentType: 'image/jpeg' });
    ok(!up.error, `upload no bucket privado ${up.error?.message ?? ''}`);
    const semLegenda = await oper.from('rdo_fotos').insert({
      rdo_id: rdoId,
      storage_path: caminho,
      legenda: 'ab',
      autor_id: id('operacional@prumo.dev'),
    });
    ok(Boolean(semLegenda.error), 'foto com legenda curta é recusada');
    const foto = await oper.from('rdo_fotos').insert({
      id: randomUUID(),
      rdo_id: rdoId,
      storage_path: caminho,
      legenda: 'Alvenaria pav 3',
      atividade_id: atv,
      autor_id: id('operacional@prumo.dev'),
      comprimida: true,
    });
    ok(!foto.error, `foto com legenda e vínculo gravada ${foto.error?.message ?? ''}`);

    console.log('\nParte 8 — fluxo de validação');
    const sub0 = await oper.rpc('rdo_submeter', { p_rdo_id: rdoId });
    ok(Boolean(sub0.error), `sem declaração: recusado ("${sub0.error?.message}")`);
    await oper.rpc('rdo_salvar_rascunho', {
      p_rdo_id: rdoId,
      p_payload: montarPayload({ ...r, declaracao_aceita: true }),
    });
    const sub1 = await oper.rpc('rdo_submeter', { p_rdo_id: rdoId });
    ok(!sub1.error && sub1.data?.status === 'submetido', `submetido ${sub1.error?.message ?? ''}`);

    const { data: notifM } = await master.from('notificacoes').select('titulo').eq('rdo_id', rdoId);
    ok((notifM?.length ?? 0) > 0, `Master notificado: "${notifM?.[0]?.titulo}"`);

    const editar = await oper.rpc('rdo_salvar_rascunho', {
      p_rdo_id: rdoId,
      p_payload: montarPayload(r),
    });
    ok(Boolean(editar.error), 'operacional não edita depois de submeter');

    const an = await master.rpc('rdo_iniciar_analise', { p_rdo_id: rdoId });
    ok(an.data?.status === 'em_analise', 'Master abre → em análise');
    const cm = await master.from('comentarios').insert({
      rdo_id: rdoId,
      autor_id: id('master@prumo.dev'),
      alvo_tipo: 'foto',
      texto: 'Foto mal enquadrada',
    });
    ok(!cm.error, 'Master comenta a foto');
    const dv = await master.rpc('rdo_devolver', {
      p_rdo_id: rdoId,
      p_motivo: 'Refaça a foto do pavimento 3',
    });
    ok(
      dv.data?.status === 'rascunho' && Boolean(dv.data?.devolucao_motivo),
      'devolvido com motivo',
    );
    const { data: notifO } = await oper
      .from('notificacoes')
      .select('tipo')
      .eq('rdo_id', rdoId)
      .eq('tipo', 'rdo_devolvido');
    ok((notifO?.length ?? 0) > 0, 'operacional notificado da devolução');

    const s3 = await oper.rpc('rdo_salvar_rascunho', {
      p_rdo_id: rdoId,
      p_payload: montarPayload({ ...r, declaracao_aceita: true }),
    });
    const sub2 = await oper.rpc('rdo_submeter', { p_rdo_id: rdoId });
    ok(
      !s3.error && sub2.data?.status === 'submetido' && sub2.data?.devolucao_motivo === null,
      'corrigido e reenviado',
    );

    const cliAntes = await cliente.from('rdos').select('id').eq('id', rdoId);
    ok(cliAntes.data?.length === 0, 'cliente ainda não enxerga (não validado)');

    const val = await master.rpc('rdo_validar', {
      p_rdo_id: rdoId,
      p_declaracao_texto: 'Declaro...',
      p_dispositivo: 'teste',
    });
    ok(
      val.data?.status === 'enviado_cliente',
      `validado e enviado ao cliente ${val.error?.message ?? ''}`,
    );

    const adult = await master
      .from('rdos')
      .update({ sem_producao_justificativa: 'x' })
      .eq('id', rdoId)
      .select();
    ok(!adult.data?.length, 'Master não altera o RDO assinado');

    const cliDepois = await cliente.from('rdos').select('id').eq('id', rdoId);
    ok(cliDepois.data?.length === 1, 'cliente passa a enxergar');

    const semRessalva = await cliente.rpc('rdo_cliente_assinar', {
      p_rdo_id: rdoId,
      p_com_ressalva: true,
      p_ressalva: '',
      p_declaracao_texto: 'x',
      p_dispositivo: 't',
    });
    ok(Boolean(semRessalva.error), 'com ressalva exige o texto da ressalva');
    const ass = await cliente.rpc('rdo_cliente_assinar', {
      p_rdo_id: rdoId,
      p_com_ressalva: true,
      p_ressalva: 'Quantitativo diverge',
      p_declaracao_texto: 'Declaro ciência',
      p_dispositivo: 't',
    });
    ok(
      ass.data?.status === 'finalizado',
      `cliente assina com ressalva → finalizado ${ass.error?.message ?? ''}`,
    );

    const { data: asss } = await master.from('assinaturas').select('tipo').eq('rdo_id', rdoId);
    ok(asss?.length === 2, `2 assinaturas: ${asss?.map((a) => a.tipo).join(', ')}`);
    const { data: snap } = await master.from('rdo_versoes').select('versao').eq('rdo_id', rdoId);
    ok(snap?.length === 1, 'snapshot congelado em rdo_versoes');

    const url = await master.storage.from('rdo-fotos').createSignedUrl(caminho, 60);
    ok(Boolean(url.data?.signedUrl), 'Master gera URL assinada da foto');

    console.log('\nParte 10 — PDF com hash registrado uma única vez');
    const caminhoPdf = `${obraId}/${rdoId}/rdo-1-v1.pdf`;
    const pdf = await master.storage
      .from('rdo-pdfs')
      .upload(caminhoPdf, new TextEncoder().encode('%PDF-1.4 teste'), {
        contentType: 'application/pdf',
      });
    ok(!pdf.error, `PDF enviado ao bucket privado ${pdf.error?.message ?? ''}`);
    const reg1 = await master.rpc('rdo_registrar_pdf', {
      p_rdo_id: rdoId,
      p_path: caminhoPdf,
      p_hash: 'a'.repeat(64),
    });
    ok(!reg1.error && reg1.data?.pdf_hash === 'a'.repeat(64), 'hash registrado');
    const reg2 = await master.rpc('rdo_registrar_pdf', {
      p_rdo_id: rdoId,
      p_path: caminhoPdf,
      p_hash: 'b'.repeat(64),
    });
    ok(Boolean(reg2.error), `segundo registro recusado ("${reg2.error?.message}")`);
    const pdfCli = await cliente.storage.from('rdo-pdfs').createSignedUrl(caminhoPdf, 60);
    ok(Boolean(pdfCli.data?.signedUrl), 'cliente consegue baixar o PDF');

    console.log('\nParte 11 — retificação, cancelamento, painel e auditoria');
    const semMotivo = await master.rpc('rdo_retificar', { p_rdo_id: rdoId, p_motivo: '' });
    ok(Boolean(semMotivo.error), 'retificar sem motivo é recusado');
    const ret = await master.rpc('rdo_retificar', {
      p_rdo_id: rdoId,
      p_motivo: 'Quantitativo de alvenaria corrigido',
    });
    ok(
      !ret.error && ret.data?.versao === 2 && ret.data?.rdo_origem_id === rdoId,
      `nova versão ${ret.data?.versao} vinculada à original ${ret.error?.message ?? ''}`,
    );
    const { data: original } = await master
      .from('rdos')
      .select('status, pdf_hash')
      .eq('id', rdoId)
      .single();
    ok(
      original?.status === 'retificado' && original?.pdf_hash === 'a'.repeat(64),
      'original vira "retificado" e mantém o hash',
    );
    const { count: ativOrig } = await master
      .from('rdo_atividades')
      .select('id', { count: 'exact', head: true })
      .eq('rdo_id', rdoId);
    const { count: ativNova } = await master
      .from('rdo_atividades')
      .select('id', { count: 'exact', head: true })
      .eq('rdo_id', ret.data!.id);
    ok(ativOrig === 1 && ativNova === 1, 'conteúdo copiado para a nova versão; original intacta');
    const mexerOriginal = await master
      .from('rdo_atividades')
      .update({ servico: 'x' })
      .eq('rdo_id', rdoId)
      .select();
    ok(!mexerOriginal.data?.length, 'original retificada continua imutável');

    const canc = await master.rpc('rdo_cancelar', {
      p_rdo_id: ret.data!.id,
      p_motivo: 'Lançado em duplicidade',
    });
    ok(canc.data?.status === 'cancelado', 'cancelamento lógico com motivo');

    const painel = await master.rpc('painel_master');
    ok(!painel.error && typeof painel.data === 'object', 'painel do Master responde');
    const aud = await master.rpc('rdo_auditoria', { p_rdo_id: rdoId });
    ok((aud.data?.length ?? 0) > 10, `auditoria do RDO: ${aud.data?.length} registros`);
    const audOper = await oper.rpc('rdo_auditoria', { p_rdo_id: rdoId });
    ok((audOper.data?.length ?? 0) === 0, 'operacional não lê auditoria');

    console.log(`\n${falhas === 0 ? 'TUDO PASSOU' : `${falhas} FALHA(S)`}`);
  } finally {
    const adm = createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false },
    });
    for (const bucket of ['rdo-fotos', 'rdo-pdfs']) {
      const { data: arquivos } = await adm.storage.from(bucket).list(obraId, { limit: 100 });
      for (const pasta of arquivos ?? []) {
        const { data: dentro } = await adm.storage.from(bucket).list(`${obraId}/${pasta.name}`);
        await adm.storage
          .from(bucket)
          .remove((dentro ?? []).map((f) => `${obraId}/${pasta.name}/${f.name}`));
      }
    }
    // Limpeza do cenário de teste: o trigger que impede DELETE de RDO é
    // desligado só dentro desta transação, pelo dono da tabela.
    await db.query('begin');
    await db.query('alter table rdos disable trigger trg_rdos_sem_delete');
    await db.query('alter table assinaturas disable trigger trg_assinaturas_imutaveis');
    await db.query('alter table comentarios disable trigger trg_comentarios_imutaveis');
    await db.query('alter table rdo_versoes disable trigger trg_rdo_versoes_imutaveis');
    for (const t of [
      'rdo_clima',
      'rdo_mao_obra',
      'rdo_equipamentos',
      'rdo_atividades',
      'rdo_ocorrencias',
      'rdo_pendencias',
      'rdo_fotos',
    ]) {
      await db.query(`alter table ${t} disable trigger trg_${t}_so_rascunho`);
    }
    await db.query(`delete from rdos where obra_id = (select id from obras where nome = $1)`, [
      OBRA,
    ]);
    await db.query(`delete from obras where nome = $1`, [OBRA]);
    await db.query('alter table rdos enable trigger trg_rdos_sem_delete');
    await db.query('alter table assinaturas enable trigger trg_assinaturas_imutaveis');
    await db.query('alter table comentarios enable trigger trg_comentarios_imutaveis');
    await db.query('alter table rdo_versoes enable trigger trg_rdo_versoes_imutaveis');
    for (const t of [
      'rdo_clima',
      'rdo_mao_obra',
      'rdo_equipamentos',
      'rdo_atividades',
      'rdo_ocorrencias',
      'rdo_pendencias',
      'rdo_fotos',
    ]) {
      await db.query(`alter table ${t} enable trigger trg_${t}_so_rascunho`);
    }
    await db.query('commit');
    await db.end();
    console.log('limpeza ok');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
