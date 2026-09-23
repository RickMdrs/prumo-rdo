import { useState } from 'react';
import type { ViewStyle } from 'react-native';

import { Campo } from './Campo';

type Props = {
  rotulo: string;
  valor: number | null;
  onChange: (valor: number | null) => void;
  decimal?: boolean;
  placeholder?: string;
  sufixo?: string;
  ajuda?: string;
  erro?: string;
  obrigatorio?: boolean;
  estilo?: ViewStyle;
};

function paraTexto(valor: number | null): string {
  return valor === null ? '' : String(valor).replace('.', ',');
}

/**
 * Número com vírgula decimal, como se escreve no Brasil. O texto digitado fica
 * na tela como está ("12," enquanto o usuário ainda digita os centésimos); o
 * valor numérico só sai quando é um número completo.
 */
export function CampoNumero({
  rotulo,
  valor,
  onChange,
  decimal = false,
  placeholder,
  sufixo,
  ajuda,
  erro,
  obrigatorio,
  estilo,
}: Props) {
  const [texto, setTexto] = useState(() => paraTexto(valor));
  const [valorAnterior, setValorAnterior] = useState(valor);

  if (valor !== valorAnterior) {
    setValorAnterior(valor);
    const atual = texto.trim() === '' ? null : Number(texto.replace(',', '.'));
    if (atual !== valor) setTexto(paraTexto(valor));
  }

  return (
    <Campo
      rotulo={sufixo ? `${rotulo} (${sufixo})` : rotulo}
      keyboardType={decimal ? 'decimal-pad' : 'number-pad'}
      placeholder={placeholder}
      value={texto}
      onChangeText={(entrada) => {
        const limpo = decimal
          ? entrada.replace(/[^\d,.]/g, '').replace('.', ',')
          : entrada.replace(/\D/g, '');
        setTexto(limpo);
        if (limpo === '') {
          onChange(null);
          return;
        }
        const numero = Number(limpo.replace(',', '.'));
        if (!Number.isNaN(numero) && !limpo.endsWith(',')) onChange(numero);
      }}
      ajuda={ajuda}
      erro={erro}
      obrigatorio={obrigatorio}
      estilo={estilo}
    />
  );
}
