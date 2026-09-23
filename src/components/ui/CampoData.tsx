import { useState } from 'react';
import type { ViewStyle } from 'react-native';

import { Campo } from './Campo';

type Props = {
  rotulo: string;
  /** Valor no formato da coluna `date`: AAAA-MM-DD. */
  valor: string | null;
  onChange: (iso: string | null) => void;
  ajuda?: string;
  erro?: string;
  obrigatorio?: boolean;
  estilo?: ViewStyle;
};

function isoParaTexto(iso: string | null): string {
  if (!iso) return '';
  const [ano, mes, dia] = iso.slice(0, 10).split('-');
  if (!ano || !mes || !dia) return '';
  return `${dia}/${mes}/${ano}`;
}

function aplicarMascara(entrada: string): string {
  const digitos = entrada.replace(/\D/g, '').slice(0, 8);
  if (digitos.length <= 2) return digitos;
  if (digitos.length <= 4) return `${digitos.slice(0, 2)}/${digitos.slice(2)}`;
  return `${digitos.slice(0, 2)}/${digitos.slice(2, 4)}/${digitos.slice(4)}`;
}

/** Só devolve ISO quando a data existe de fato no calendário. */
function textoParaIso(texto: string): string | null {
  const digitos = texto.replace(/\D/g, '');
  if (digitos.length !== 8) return null;

  const dia = Number(digitos.slice(0, 2));
  const mes = Number(digitos.slice(2, 4));
  const ano = Number(digitos.slice(4));

  if (mes < 1 || mes > 12 || dia < 1 || ano < 1900) return null;

  const diasNoMes = new Date(ano, mes, 0).getDate();
  if (dia > diasNoMes) return null;

  return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

/**
 * Entrada de data por digitação, com máscara. Evita depender de um seletor
 * nativo e funciona igual em Android e iPhone dentro do Expo Go.
 */
export function CampoData({ rotulo, valor, onChange, ajuda, erro, obrigatorio, estilo }: Props) {
  const [texto, setTexto] = useState(() => isoParaTexto(valor));
  const [valorAnterior, setValorAnterior] = useState(valor);

  // Sincroniza com o valor de fora (um reset do formulário, por exemplo) sem
  // atropelar a digitação: enquanto o texto ainda representa o mesmo valor,
  // uma data pela metade continua na tela.
  if (valor !== valorAnterior) {
    setValorAnterior(valor);
    if (valor !== textoParaIso(texto)) {
      setTexto(isoParaTexto(valor));
    }
  }

  const incompleta = texto.replace(/\D/g, '').length > 0 && textoParaIso(texto) === null;

  return (
    <Campo
      rotulo={rotulo}
      placeholder="DD/MM/AAAA"
      iconeEsquerda="calendar"
      keyboardType="number-pad"
      maxLength={10}
      value={texto}
      onChangeText={(entrada) => {
        const mascarado = aplicarMascara(entrada);
        setTexto(mascarado);
        onChange(textoParaIso(mascarado));
      }}
      ajuda={ajuda}
      erro={erro ?? (incompleta ? 'Data incompleta ou inexistente' : undefined)}
      obrigatorio={obrigatorio}
      estilo={estilo}
    />
  );
}
