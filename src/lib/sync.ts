import NetInfo from '@react-native-community/netinfo';
import { File } from 'expo-file-system';

import { montarPayload } from '@/features/rdo/payload';
import { useFilaStore } from '@/features/sync/store';
import {
  atualizarFoto,
  concluirSincronizacao,
  contarPendencias,
  listarFotosPendentes,
  listarPendentes,
  marcarSincronizando,
  registrarErroSync,
  buscarRdoLocal,
} from './db-local';
import { traduzirErro } from './erros';
import { supabase } from './supabase';

async function sincronizarRdos(autorId: string): Promise<string | null> {
  let ultimoErro: string | null = null;

  for (const item of await listarPendentes(autorId)) {
    const inicio = item.atualizado_em;
    await marcarSincronizando(item.id_local);

    try {
      let idRemoto = item.id_remoto;
      let numero = item.rascunho.numero;

      if (!idRemoto) {
        // O id nasce no aparelho: se a resposta se perder e isto rodar de
        // novo, o banco devolve o mesmo RDO em vez de gastar outro número.
        const { data, error } = await supabase.rpc('rdo_criar', {
          p_obra_id: item.obra_id,
          p_data: item.rascunho.data,
          p_turno: item.rascunho.turno,
          p_id: item.id_local,
        });
        if (error) throw error;
        idRemoto = data.id;
        numero = data.numero;
      }

      const { data: salvo, error } = await supabase.rpc('rdo_salvar_rascunho', {
        p_rdo_id: idRemoto,
        p_payload: montarPayload(item.rascunho),
      });
      if (error) throw error;

      await concluirSincronizacao(item.id_local, idRemoto, numero ?? salvo.numero, inicio);
    } catch (erro) {
      ultimoErro = traduzirErro(erro);
      await registrarErroSync(item.id_local, ultimoErro);
    }
  }

  return ultimoErro;
}

async function sincronizarFotos(autorId: string): Promise<string | null> {
  let ultimoErro: string | null = null;

  for (const foto of await listarFotosPendentes(autorId)) {
    const rdo = await buscarRdoLocal(foto.rdo_id_local);

    // A foto só sobe depois que o RDO dela existe no servidor.
    if (!rdo?.id_remoto) continue;

    await atualizarFoto(foto.id_local, { status_sync: 'sincronizando' });

    try {
      const caminho = foto.storage_path ?? `${rdo.obra_id}/${rdo.id_remoto}/${foto.id_local}.jpg`;

      if (!foto.storage_path) {
        const bytes = await new File(foto.uri).arrayBuffer();
        const { error } = await supabase.storage
          .from('rdo-fotos')
          .upload(caminho, bytes, { contentType: 'image/jpeg', upsert: true });
        if (error) throw error;

        // Registrado antes do insert: se o insert falhar, a próxima rodada
        // não sobe o arquivo de novo.
        await atualizarFoto(foto.id_local, { storage_path: caminho });
      }

      const { error } = await supabase.from('rdo_fotos').upsert(
        {
          id: foto.id_local,
          rdo_id: rdo.id_remoto,
          storage_path: caminho,
          legenda: foto.legenda,
          atividade_id: foto.vinculo?.tipo === 'atividade' ? foto.vinculo.id : null,
          ocorrencia_id: foto.vinculo?.tipo === 'ocorrencia' ? foto.vinculo.id : null,
          autor_id: autorId,
          capturada_em: foto.capturada_em,
          comprimida: true,
        },
        { onConflict: 'id', ignoreDuplicates: true },
      );
      if (error) throw error;

      await atualizarFoto(foto.id_local, { status_sync: 'sincronizado', erro: null });
    } catch (erro) {
      ultimoErro = traduzirErro(erro);
      await atualizarFoto(foto.id_local, { status_sync: 'erro', erro: ultimoErro });
    }
  }

  return ultimoErro;
}

let emAndamento: Promise<void> | null = null;
let pedidoDuranteExecucao = false;

export async function atualizarContagem(): Promise<void> {
  const { data } = await supabase.auth.getSession();
  const autorId = data.session?.user.id;
  if (!autorId) return;
  useFilaStore.getState().definirPendentes(await contarPendencias(autorId));
}

/**
 * Processa a fila inteira. Chamadas simultâneas se juntam à que já está
 * rodando, então disparar de vários lugares (rede voltou, app abriu, rascunho
 * salvo) nunca manda o mesmo item duas vezes ao mesmo tempo.
 */
export function sincronizar(): Promise<void> {
  if (emAndamento) {
    // Algo mudou enquanto a rodada atual rodava: garante mais uma no fim.
    pedidoDuranteExecucao = true;
    return emAndamento;
  }

  emAndamento = (async () => {
    const fila = useFilaStore.getState();

    try {
      const { data } = await supabase.auth.getSession();
      const autorId = data.session?.user.id;
      if (!autorId) return;

      await atualizarContagem();

      const rede = await NetInfo.fetch();
      if (!rede.isConnected || rede.isInternetReachable === false) return;

      if (useFilaStore.getState().pendentes === 0) return;

      fila.iniciar();
      const erroRdos = await sincronizarRdos(autorId);
      const erroFotos = await sincronizarFotos(autorId);
      await atualizarContagem();
      fila.concluir(erroRdos ?? erroFotos);
    } catch (erro) {
      fila.concluir(traduzirErro(erro));
    } finally {
      emAndamento = null;
      if (pedidoDuranteExecucao) {
        pedidoDuranteExecucao = false;
        void sincronizar();
      }
    }
  })();

  return emAndamento;
}

let temporizador: ReturnType<typeof setTimeout> | null = null;

/** Para chamar depois de cada gravação local: junta rajadas de digitação. */
export function agendarSincronizacao(atrasoMs = 2500): void {
  void atualizarContagem();
  if (temporizador) clearTimeout(temporizador);
  temporizador = setTimeout(() => {
    temporizador = null;
    void sincronizar();
  }, atrasoMs);
}
