import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { MarcaPrumo } from '@/components/MarcaPrumo';
import { Botao, Texto } from '@/components/ui';
import { cores, espaco } from '@/theme/tokens';
import { autenticarPorBiometria } from './biometria';
import { useAuth } from './useAuth';

export function TravaBiometrica() {
  const { definirTravado, sair } = useAuth();
  const [tentando, setTentando] = useState(true);
  const [falhou, setFalhou] = useState(false);

  // A primeira instrução é o await de propósito: nada de estado muda de forma
  // síncrona quando o efeito de montagem chama esta função.
  const tentar = useCallback(async () => {
    const ok = await autenticarPorBiometria();

    if (ok) {
      definirTravado(false);
      return;
    }

    setTentando(false);
    setFalhou(true);
  }, [definirTravado]);

  useEffect(() => {
    // A regra sinaliza qualquer setState alcançável a partir do efeito. Neste
    // caso todos acontecem depois do await do sensor biométrico, então não há
    // renderização em cascata — e pedir a digital sozinho, ao abrir, é o
    // comportamento esperado de uma trava.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void tentar();
  }, [tentar]);

  function tentarDeNovo() {
    setTentando(true);
    setFalhou(false);
    void tentar();
  }

  return (
    <View style={styles.base}>
      <MarcaPrumo tamanho={72} />

      <View style={styles.textos}>
        <Texto variante="titulo" centro>
          Prumo RDO bloqueado
        </Texto>
        <Texto variante="corpo" cor={cores.textoSecundario} centro>
          {falhou
            ? 'Não foi possível confirmar sua identidade. Tente de novo ou entre com a senha.'
            : 'Confirme sua identidade para continuar.'}
        </Texto>
      </View>

      <View style={styles.acoes}>
        <Botao
          titulo="Desbloquear"
          iconeEsquerda="unlock"
          carregando={tentando}
          onPress={tentarDeNovo}
        />
        <Botao titulo="Entrar com a senha" variante="secundaria" onPress={() => void sair()} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: espaco.xl,
    padding: espaco.xl,
    backgroundColor: cores.fundo,
  },
  textos: { gap: espaco.sm, alignItems: 'center' },
  acoes: { alignSelf: 'stretch', gap: espaco.md },
});
