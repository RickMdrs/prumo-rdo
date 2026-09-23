import { useQuery } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ALTURA_BARRA_ABAS } from '@/components/BarraAbas';
import { CabecalhoTela } from '@/components/CabecalhoTela';
import { Seletor, Tela } from '@/components/ui';
import { listarCaixa } from '@/features/fluxo/caixa';
import { ListaCaixa } from '@/features/fluxo/ListaCaixa';
import { espaco } from '@/theme/tokens';

type Filtro = 'cliente' | 'finalizados';

const FILTROS: { valor: Filtro; rotulo: string }[] = [
  { valor: 'cliente', rotulo: 'Aguardando você' },
  { valor: 'finalizados', rotulo: 'Finalizados' },
];

export default function Ciencia() {
  const [filtro, setFiltro] = useState<Filtro>('cliente');

  const consulta = useQuery({
    queryKey: ['caixa', filtro],
    queryFn: () => listarCaixa(filtro),
  });

  useFocusEffect(
    useCallback(() => {
      void consulta.refetch();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  return (
    <Tela folgaInferior={ALTURA_BARRA_ABAS}>
      <CabecalhoTela titulo="RDOs para ciência" subtitulo="Validados pelo responsável técnico" />

      <View style={styles.filtro}>
        <Seletor opcoes={FILTROS} valor={filtro} onChange={setFiltro} />
      </View>

      <ListaCaixa
        itens={consulta.data}
        carregando={consulta.isPending}
        erro={consulta.error}
        onTentarDeNovo={() => void consulta.refetch()}
        vazio={
          filtro === 'cliente'
            ? {
                titulo: 'Nada esperando sua assinatura',
                descricao: 'Quando um RDO for validado, ele aparece aqui e você recebe um aviso.',
              }
            : { titulo: 'Nenhum RDO finalizado', descricao: 'Os RDOs com sua ciência ficam aqui.' }
        }
      />
    </Tela>
  );
}

const styles = StyleSheet.create({
  filtro: { marginBottom: espaco.lg },
});
