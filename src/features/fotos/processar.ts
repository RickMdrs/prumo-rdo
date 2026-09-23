import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

const LARGURA_MAXIMA = 1600;
const TAMANHO_MAXIMO = 2 * 1024 * 1024;

export type Origem = 'camera' | 'galeria';

export type ResultadoCaptura =
  { tipo: 'ok'; uri: string } | { tipo: 'cancelado' } | { tipo: 'sem_permissao'; mensagem: string };

async function pedirPermissao(origem: Origem): Promise<boolean> {
  const resposta =
    origem === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  return resposta.granted;
}

/**
 * Reduz para no máximo 1600 px de largura e ~2 MB. Se a primeira compressão
 * ainda passar do limite (foto muito detalhada), aperta mais uma vez.
 */
async function comprimir(uri: string, largura: number): Promise<string> {
  let qualidade = 0.72;

  for (let tentativa = 0; tentativa < 3; tentativa++) {
    const contexto = ImageManipulator.manipulate(uri);
    if (largura > LARGURA_MAXIMA) contexto.resize({ width: LARGURA_MAXIMA });
    const imagem = await contexto.renderAsync();
    const salvo = await imagem.saveAsync({ compress: qualidade, format: SaveFormat.JPEG });

    const tamanho = new File(salvo.uri).size;
    if (tamanho <= TAMANHO_MAXIMO) return salvo.uri;
    qualidade -= 0.2;
  }

  throw new Error('Não foi possível reduzir a foto para menos de 2 MB.');
}

/**
 * Move a foto comprimida para a pasta de documentos do app. O cache do
 * seletor de imagens pode ser limpo pelo sistema a qualquer momento — e a
 * foto precisa sobreviver até a rede voltar.
 */
function guardar(uri: string, nome: string): string {
  const pasta = new Directory(Paths.document, 'fotos-rdo');
  if (!pasta.exists) pasta.create({ intermediates: true, idempotent: true });
  const destino = new File(pasta, `${nome}.jpg`);
  if (destino.exists) destino.delete();
  new File(uri).move(destino);
  return destino.uri;
}

export async function capturarFoto(origem: Origem, idFoto: string): Promise<ResultadoCaptura> {
  if (!(await pedirPermissao(origem))) {
    return {
      tipo: 'sem_permissao',
      mensagem:
        origem === 'camera'
          ? 'O Prumo precisa da câmera para registrar as fotos da obra. Libere o acesso nas configurações do aparelho.'
          : 'O Prumo precisa acessar a galeria para anexar fotos já tiradas. Libere o acesso nas configurações do aparelho.',
    };
  }

  const opcoes: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    quality: 1,
    exif: false,
  };

  const resultado =
    origem === 'camera'
      ? await ImagePicker.launchCameraAsync(opcoes)
      : await ImagePicker.launchImageLibraryAsync(opcoes);

  const ativo = resultado.assets?.[0];
  if (resultado.canceled || !ativo) return { tipo: 'cancelado' };

  const comprimida = await comprimir(ativo.uri, ativo.width);
  return { tipo: 'ok', uri: guardar(comprimida, idFoto) };
}

export function apagarArquivoLocal(uri: string): void {
  try {
    const arquivo = new File(uri);
    if (arquivo.exists) arquivo.delete();
  } catch {
    // Arquivo já sumiu: nada a limpar.
  }
}
