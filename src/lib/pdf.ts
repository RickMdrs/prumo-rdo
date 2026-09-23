import { Directory, File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import type { RdoCompleto } from '@/features/rdo/detalhe';
import { traduzirErro } from './erros';
import { sha256Bytes, sha256Texto } from './hash';
import { conteudoCanonico, montarHtmlRdo } from './pdf-html';
import { supabase } from './supabase';

export type Etapa = 'fotos' | 'pdf' | 'hash' | 'envio' | 'registro';

function pastaTemporaria(): Directory {
  const pasta = new Directory(Paths.cache, 'prumo-pdf');
  if (!pasta.exists) pasta.create({ intermediates: true, idempotent: true });
  return pasta;
}

/** As fotos vão embutidas no PDF, então ele continua completo sem internet. */
async function fotosEmBase64(d: RdoCompleto): Promise<Record<string, string>> {
  const pasta = pastaTemporaria();
  const resultado: Record<string, string> = {};

  for (const foto of d.fotos) {
    if (!foto.url) continue;
    try {
      const arquivo = await File.downloadFileAsync(foto.url, new File(pasta, `${foto.id}.jpg`), {
        idempotent: true,
      });
      resultado[foto.id] = `data:image/jpeg;base64,${await arquivo.base64()}`;
      arquivo.delete();
    } catch {
      // Foto indisponível no momento: o PDF sai com o aviso no lugar dela.
    }
  }

  return resultado;
}

export function caminhoPdf(d: RdoCompleto): string {
  return `${d.obra.id}/${d.rdo.id}/rdo-${d.rdo.numero}-v${d.rdo.versao}.pdf`;
}

/**
 * Gera o PDF final no aparelho, calcula o SHA-256 dos bytes, sobe para o
 * bucket privado e registra caminho e hash no banco — uma única vez: a função
 * rdo_registrar_pdf recusa um segundo registro.
 */
export async function gerarPdfFinal(
  d: RdoCompleto,
  aoAvancar: (etapa: Etapa) => void,
): Promise<{ uri: string; hash: string }> {
  aoAvancar('fotos');
  const fotos = await fotosEmBase64(d);
  const hashConteudo = await sha256Texto(conteudoCanonico(d));

  aoAvancar('pdf');
  const { uri } = await Print.printToFileAsync({ html: montarHtmlRdo(d, fotos, hashConteudo) });

  // Nome estável para compartilhar (o expo-print gera um nome aleatório).
  const destino = new File(pastaTemporaria(), `RDO-${d.rdo.numero}-v${d.rdo.versao}.pdf`);
  if (destino.exists) destino.delete();
  new File(uri).move(destino);

  aoAvancar('hash');
  const bytes = await destino.bytes();
  const hash = await sha256Bytes(bytes);

  aoAvancar('envio');
  const caminho = caminhoPdf(d);
  const envio = await supabase.storage
    .from('rdo-pdfs')
    .upload(caminho, bytes, { contentType: 'application/pdf', upsert: false });
  if (envio.error) throw new Error(traduzirErro(envio.error));

  aoAvancar('registro');
  const { error } = await supabase.rpc('rdo_registrar_pdf', {
    p_rdo_id: d.rdo.id,
    p_path: caminho,
    p_hash: hash,
  });
  if (error) throw new Error(traduzirErro(error));

  return { uri: destino.uri, hash };
}

/** Baixa o PDF guardado no Storage para uma pasta temporária do aparelho. */
export async function baixarPdf(d: RdoCompleto): Promise<File> {
  if (!d.rdo.pdf_path) throw new Error('Este RDO ainda não tem PDF final.');

  const { data, error } = await supabase.storage
    .from('rdo-pdfs')
    .createSignedUrl(d.rdo.pdf_path, 300);
  if (error || !data) throw new Error(traduzirErro(error));

  const destino = new File(pastaTemporaria(), `RDO-${d.rdo.numero}-v${d.rdo.versao}.pdf`);
  return File.downloadFileAsync(data.signedUrl, destino, { idempotent: true });
}

export type ResultadoVerificacao = {
  integro: boolean;
  hashRegistrado: string;
  hashCalculado: string;
};

/**
 * Baixa o PDF armazenado, recalcula o SHA-256 no próprio aparelho e compara
 * com o hash que o banco guardou na emissão. Qualquer byte alterado no arquivo
 * muda o hash inteiro.
 */
export async function verificarPdf(d: RdoCompleto): Promise<ResultadoVerificacao> {
  if (!d.rdo.pdf_hash) throw new Error('Este RDO ainda não tem PDF registrado.');
  const arquivo = await baixarPdf(d);
  const hashCalculado = await sha256Bytes(await arquivo.bytes());
  return {
    integro: hashCalculado === d.rdo.pdf_hash,
    hashRegistrado: d.rdo.pdf_hash,
    hashCalculado,
  };
}

export async function compartilharPdf(uri: string): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('O compartilhamento não está disponível neste aparelho.');
  }
  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    UTI: 'com.adobe.pdf',
    dialogTitle: 'Compartilhar RDO',
  });
}
