import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Switch, View } from 'react-native';

import { ALTURA_BARRA_ABAS } from '@/components/BarraAbas';
import { CabecalhoTela } from '@/components/CabecalhoTela';
import { Botao, Cartao, Tela, Texto } from '@/components/ui';
import {
  biometriaAtiva,
  biometriaDisponivel,
  definirBiometriaAtiva,
} from '@/features/auth/biometria';
import { useAuth } from '@/features/auth/useAuth';
import { cores, espaco, raio } from '@/theme/tokens';

const ROTULO_PAPEL: Record<string, string> = {
  master: 'Responsável técnico',
  operacional: 'Equipe de campo',
  cliente: 'Contratante',
};

export default function Perfil() {
  const { perfil, sessao, sair } = useAuth();

  const [temBiometria, setTemBiometria] = useState(false);
  const [biometriaLigada, setBiometriaLigada] = useState(false);

  useEffect(() => {
    void (async () => {
      const [disponivel, ativa] = await Promise.all([biometriaDisponivel(), biometriaAtiva()]);
      setTemBiometria(disponivel);
      setBiometriaLigada(disponivel && ativa);
    })();
  }, []);

  async function alternarBiometria(valor: boolean) {
    setBiometriaLigada(valor);
    await definirBiometriaAtiva(valor);
  }

  function confirmarSaida() {
    Alert.alert('Sair da conta', 'Você vai precisar entrar com e-mail e senha de novo.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: () => void sair() },
    ]);
  }

  const iniciais =
    perfil?.nome
      .split(' ')
      .filter((p) => p.length > 2)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('') ?? '';

  return (
    <Tela folgaInferior={ALTURA_BARRA_ABAS}>
      <CabecalhoTela titulo="Perfil" />

      <View style={styles.identidade}>
        <View style={styles.avatar}>
          <Texto variante="titulo" cor={cores.sobrePrimaria}>
            {iniciais}
          </Texto>
        </View>
        <View style={styles.identidadeTextos}>
          <Texto variante="subtitulo" numberOfLines={2}>
            {perfil?.nome}
          </Texto>
          <Texto variante="auxiliar" cor={cores.textoSecundario}>
            {sessao?.user.email}
          </Texto>
          <View style={styles.etiqueta}>
            <Texto variante="rotulo" cor={cores.primaria}>
              {(ROTULO_PAPEL[perfil?.papel ?? ''] ?? '').toUpperCase()}
            </Texto>
          </View>
        </View>
      </View>

      <View style={styles.secao}>
        <Texto variante="subtitulo">Segurança</Texto>

        <Cartao variante="contorno">
          <View style={styles.linha}>
            <View style={styles.linhaTextos}>
              <Texto variante="corpoForte">Desbloqueio por biometria</Texto>
              <Texto variante="auxiliar" cor={cores.textoSecundario}>
                {temBiometria
                  ? 'Pede digital ou rosto ao abrir o aplicativo.'
                  : 'Este aparelho não tem biometria configurada.'}
              </Texto>
            </View>
            <Switch
              value={biometriaLigada}
              onValueChange={(v) => void alternarBiometria(v)}
              disabled={!temBiometria}
              trackColor={{ true: cores.primaria, false: cores.bordaForte }}
              accessibilityLabel="Desbloqueio por biometria"
            />
          </View>
        </Cartao>
      </View>

      <View style={styles.secao}>
        <Botao
          titulo="Sair da conta"
          variante="secundaria"
          iconeEsquerda="log-out"
          onPress={confirmarSaida}
        />
      </View>

      <Texto variante="auxiliar" cor={cores.textoDesabilitado} centro style={styles.rodape}>
        Prumo RDO · versão 1.0.0
      </Texto>
    </Tela>
  );
}

const styles = StyleSheet.create({
  identidade: { flexDirection: 'row', alignItems: 'center', gap: espaco.lg },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: raio.pill,
    backgroundColor: cores.primaria,
    alignItems: 'center',
    justifyContent: 'center',
  },
  identidadeTextos: { flex: 1, gap: espaco.xs },
  etiqueta: {
    alignSelf: 'flex-start',
    backgroundColor: '#E7EDF5',
    paddingVertical: 4,
    paddingHorizontal: espaco.md,
    borderRadius: raio.pill,
  },
  secao: { gap: espaco.md, marginTop: espaco.xl },
  linha: { flexDirection: 'row', alignItems: 'center', gap: espaco.md },
  linhaTextos: { flex: 1, gap: 2 },
  rodape: { marginTop: espaco.xxl },
});
