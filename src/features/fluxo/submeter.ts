import NetInfo from '@react-native-community/netinfo';

import { apagarArquivoLocal } from '@/features/fotos/processar';
import { buscarRdoLocal, listarFotosDoRdo, removerRdoLocal } from '@/lib/db-local';
import { traduzirErro } from '@/lib/erros';
import { supabase } from '@/lib/supabase';
import { sincronizar } from '@/lib/sync';

/**
 * Submeter exige que o servidor tenha exatamente o que está na tela: primeiro
 * a fila é esvaziada, depois o banco decide (rdo_submeter valida a regra 8
 * por conta própria — a checagem do app é só para a mensagem vir antes).
 */
export async function submeterRdo(idLocal: string): Promise<number> {
  const rede = await NetInfo.fetch();
  if (!rede.isConnected || rede.isInternetReachable === false) {
    throw new Error(
      'Sem conexão. O rascunho está salvo no aparelho; submeta quando a internet voltar.',
    );
  }

  // Uma rodada pode já estar em andamento quando o botão é tocado (a foto que
  // acabou de ser tirada, por exemplo). Repete até a fila deste RDO esvaziar.
  for (let tentativa = 0; tentativa < 4; tentativa++) {
    await sincronizar();
    const atual = await buscarRdoLocal(idLocal);
    const fotosAtuais = await listarFotosDoRdo(idLocal);
    const pronto =
      atual?.status_sync === 'sincronizado' &&
      fotosAtuais.every((f) => f.status_sync === 'sincronizado');
    if (pronto || atual?.status_sync === 'erro') break;
  }

  const local = await buscarRdoLocal(idLocal);
  if (!local?.id_remoto || local.status_sync !== 'sincronizado') {
    throw new Error(
      local?.erro
        ? `O rascunho ainda não chegou ao servidor: ${local.erro}`
        : 'O rascunho ainda não chegou ao servidor. Aguarde o envio e tente de novo.',
    );
  }

  const fotos = await listarFotosDoRdo(idLocal);
  const presas = fotos.filter((f) => f.status_sync !== 'sincronizado');
  if (presas.length > 0) {
    throw new Error(
      `${presas.length} foto(s) ainda não foram enviadas. Aguarde o envio e tente de novo.`,
    );
  }

  const { data, error } = await supabase.rpc('rdo_submeter', { p_rdo_id: local.id_remoto });
  if (error) throw new Error(traduzirErro(error));

  // A partir daqui o RDO não é mais editável: a cópia local e as fotos já
  // enviadas não têm mais função no aparelho.
  for (const f of fotos) apagarArquivoLocal(f.uri);
  await removerRdoLocal(idLocal);

  return data.numero;
}
