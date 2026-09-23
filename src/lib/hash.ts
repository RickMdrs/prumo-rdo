import * as Crypto from 'expo-crypto';

function paraHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** SHA-256 dos bytes de um arquivo — é o que fica em `rdos.pdf_hash`. */
export async function sha256Bytes(bytes: Uint8Array): Promise<string> {
  const copia = new Uint8Array(bytes);
  return paraHex(await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, copia));
}

/** SHA-256 de um texto (usado no hash do conteúdo, impresso no QR Code). */
export function sha256Texto(texto: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, texto);
}
