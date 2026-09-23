import * as SQLite from 'expo-sqlite';

import type { RascunhoRdo, StatusSync } from '@/features/rdo/tipos';

/**
 * Banco do aparelho. Não é a fonte da verdade — é a fila de saída: o que o
 * operacional lançou e ainda não chegou ao Supabase, ou chegou e continua
 * disponível para editar sem rede.
 */

let conexao: Promise<SQLite.SQLiteDatabase> | null = null;

function abrir(): Promise<SQLite.SQLiteDatabase> {
  if (!conexao) {
    conexao = (async () => {
      const db = await SQLite.openDatabaseAsync('prumo.db');
      await db.execAsync(`
        pragma journal_mode = wal;

        create table if not exists rdos_locais (
          id_local text primary key not null,
          id_remoto text,
          autor_id text not null,
          obra_id text not null,
          payload text not null,
          status_sync text not null default 'pendente',
          erro text,
          atualizado_em text not null
        );

        create table if not exists fotos_pendentes (
          id_local text primary key not null,
          rdo_id_local text not null,
          autor_id text not null,
          uri text not null,
          legenda text not null,
          vinculo text,
          capturada_em text not null,
          status_sync text not null default 'pendente',
          erro text,
          storage_path text
        );

        create index if not exists rdos_locais_status on rdos_locais (status_sync);
        create index if not exists fotos_pendentes_rdo on fotos_pendentes (rdo_id_local);
      `);
      return db;
    })();
  }
  return conexao;
}

export type RdoLocal = {
  id_local: string;
  id_remoto: string | null;
  autor_id: string;
  obra_id: string;
  rascunho: RascunhoRdo;
  status_sync: StatusSync;
  erro: string | null;
  atualizado_em: string;
};

type LinhaRdo = Omit<RdoLocal, 'rascunho'> & { payload: string };

function converter(linha: LinhaRdo): RdoLocal {
  const { payload, ...resto } = linha;
  return { ...resto, rascunho: JSON.parse(payload) as RascunhoRdo };
}

/** Toda gravação local marca o RDO como pendente de envio. */
export async function salvarRdoLocal(rascunho: RascunhoRdo, autorId: string): Promise<void> {
  const db = await abrir();
  await db.runAsync(
    `insert into rdos_locais (id_local, autor_id, obra_id, payload, status_sync, erro, atualizado_em)
     values (?, ?, ?, ?, 'pendente', null, ?)
     on conflict (id_local) do update set
       obra_id = excluded.obra_id,
       payload = excluded.payload,
       status_sync = 'pendente',
       erro = null,
       atualizado_em = excluded.atualizado_em`,
    [rascunho.id, autorId, rascunho.obra_id, JSON.stringify(rascunho), new Date().toISOString()],
  );
}

/** RDO que veio do servidor (ex.: devolvido) e passa a ser editável aqui. */
export async function salvarRdoBaixado(
  rascunho: RascunhoRdo,
  autorId: string,
  idRemoto: string,
): Promise<void> {
  const db = await abrir();
  await db.runAsync(
    `insert into rdos_locais
       (id_local, id_remoto, autor_id, obra_id, payload, status_sync, erro, atualizado_em)
     values (?, ?, ?, ?, ?, 'sincronizado', null, ?)
     on conflict (id_local) do update set
       id_remoto = excluded.id_remoto,
       payload = excluded.payload,
       status_sync = 'sincronizado',
       erro = null,
       atualizado_em = excluded.atualizado_em`,
    [
      rascunho.id,
      idRemoto,
      autorId,
      rascunho.obra_id,
      JSON.stringify(rascunho),
      new Date().toISOString(),
    ],
  );
}

export async function buscarRdoLocal(idLocal: string): Promise<RdoLocal | null> {
  const db = await abrir();
  const linha = await db.getFirstAsync<LinhaRdo>('select * from rdos_locais where id_local = ?', [
    idLocal,
  ]);
  return linha ? converter(linha) : null;
}

export async function listarRdosLocais(autorId: string): Promise<RdoLocal[]> {
  const db = await abrir();
  const linhas = await db.getAllAsync<LinhaRdo>(
    'select * from rdos_locais where autor_id = ? order by atualizado_em desc',
    [autorId],
  );
  return linhas.map(converter);
}

export async function listarPendentes(autorId: string): Promise<RdoLocal[]> {
  const db = await abrir();
  const linhas = await db.getAllAsync<LinhaRdo>(
    `select * from rdos_locais
     where autor_id = ? and status_sync in ('pendente', 'erro', 'sincronizando')
     order by atualizado_em`,
    [autorId],
  );
  return linhas.map(converter);
}

export async function marcarSincronizando(idLocal: string): Promise<void> {
  const db = await abrir();
  await db.runAsync(`update rdos_locais set status_sync = 'sincronizando' where id_local = ?`, [
    idLocal,
  ]);
}

/**
 * Só vira "sincronizado" se ninguém mexeu no rascunho enquanto o envio
 * acontecia. Se o operacional editou no meio, continua pendente e vai de novo.
 */
export async function concluirSincronizacao(
  idLocal: string,
  idRemoto: string,
  numero: number,
  atualizadoEmNoInicio: string,
): Promise<void> {
  const db = await abrir();
  const atual = await buscarRdoLocal(idLocal);
  if (!atual) return;

  const rascunho = { ...atual.rascunho, numero };

  await db.runAsync(
    `update rdos_locais set
       id_remoto = ?,
       payload = ?,
       erro = null,
       status_sync = case when atualizado_em = ? then 'sincronizado' else 'pendente' end
     where id_local = ?`,
    [idRemoto, JSON.stringify(rascunho), atualizadoEmNoInicio, idLocal],
  );
}

export async function registrarErroSync(idLocal: string, mensagem: string): Promise<void> {
  const db = await abrir();
  await db.runAsync(`update rdos_locais set status_sync = 'erro', erro = ? where id_local = ?`, [
    mensagem,
    idLocal,
  ]);
}

export async function removerRdoLocal(idLocal: string): Promise<void> {
  const db = await abrir();
  await db.runAsync('delete from fotos_pendentes where rdo_id_local = ?', [idLocal]);
  await db.runAsync('delete from rdos_locais where id_local = ?', [idLocal]);
}

// -----------------------------------------------------------------------------
// Fotos
// -----------------------------------------------------------------------------

export type VinculoFoto = { tipo: 'atividade' | 'ocorrencia'; id: string } | null;

export type FotoPendente = {
  id_local: string;
  rdo_id_local: string;
  autor_id: string;
  uri: string;
  legenda: string;
  vinculo: VinculoFoto;
  capturada_em: string;
  status_sync: StatusSync;
  erro: string | null;
  storage_path: string | null;
};

type LinhaFoto = Omit<FotoPendente, 'vinculo'> & { vinculo: string | null };

function converterFoto(linha: LinhaFoto): FotoPendente {
  return { ...linha, vinculo: linha.vinculo ? (JSON.parse(linha.vinculo) as VinculoFoto) : null };
}

export async function adicionarFoto(
  foto: Omit<FotoPendente, 'status_sync' | 'erro' | 'storage_path'>,
): Promise<void> {
  const db = await abrir();
  await db.runAsync(
    `insert into fotos_pendentes
       (id_local, rdo_id_local, autor_id, uri, legenda, vinculo, capturada_em, status_sync)
     values (?, ?, ?, ?, ?, ?, ?, 'pendente')`,
    [
      foto.id_local,
      foto.rdo_id_local,
      foto.autor_id,
      foto.uri,
      foto.legenda,
      foto.vinculo ? JSON.stringify(foto.vinculo) : null,
      foto.capturada_em,
    ],
  );
}

export async function listarFotosDoRdo(rdoIdLocal: string): Promise<FotoPendente[]> {
  const db = await abrir();
  const linhas = await db.getAllAsync<LinhaFoto>(
    'select * from fotos_pendentes where rdo_id_local = ? order by capturada_em',
    [rdoIdLocal],
  );
  return linhas.map(converterFoto);
}

export async function listarFotosPendentes(autorId: string): Promise<FotoPendente[]> {
  const db = await abrir();
  const linhas = await db.getAllAsync<LinhaFoto>(
    `select * from fotos_pendentes
     where autor_id = ? and status_sync in ('pendente', 'erro', 'sincronizando')
     order by capturada_em`,
    [autorId],
  );
  return linhas.map(converterFoto);
}

export async function atualizarFoto(
  idLocal: string,
  campos: Partial<Pick<FotoPendente, 'status_sync' | 'erro' | 'storage_path' | 'legenda'>>,
): Promise<void> {
  const db = await abrir();
  const partes: string[] = [];
  const valores: (string | null)[] = [];
  for (const [chave, valor] of Object.entries(campos)) {
    partes.push(`${chave} = ?`);
    valores.push(valor ?? null);
  }
  if (partes.length === 0) return;
  valores.push(idLocal);
  await db.runAsync(`update fotos_pendentes set ${partes.join(', ')} where id_local = ?`, valores);
}

export async function removerFoto(idLocal: string): Promise<void> {
  const db = await abrir();
  await db.runAsync('delete from fotos_pendentes where id_local = ?', [idLocal]);
}

export async function contarPendencias(autorId: string): Promise<number> {
  const db = await abrir();
  const rdos = await db.getFirstAsync<{ n: number }>(
    `select count(*) as n from rdos_locais
     where autor_id = ? and status_sync in ('pendente', 'erro', 'sincronizando')`,
    [autorId],
  );
  const fotos = await db.getFirstAsync<{ n: number }>(
    `select count(*) as n from fotos_pendentes
     where autor_id = ? and status_sync in ('pendente', 'erro', 'sincronizando')`,
    [autorId],
  );
  return (rdos?.n ?? 0) + (fotos?.n ?? 0);
}
