import { useRouter } from 'expo-router';
import { KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';

import { ALTURA_BARRA_ABAS } from '@/components/BarraAbas';
import { Botao, Tela, Texto } from '@/components/ui';
import { FormularioObra } from '@/features/obras/FormularioObra';
import { useCriarObra } from '@/features/obras/hooks';
import { cores, espaco } from '@/theme/tokens';

export default function NovaObra() {
  const router = useRouter();
  const criar = useCriarObra();

  return (
    <KeyboardAvoidingView
      style={styles.teclado}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Tela folgaInferior={ALTURA_BARRA_ABAS}>
        <Botao
          titulo="Voltar"
          variante="fantasma"
          iconeEsquerda="arrow-left"
          larguraTotal={false}
          onPress={() => router.back()}
        />

        <Texto variante="display" style={styles.titulo}>
          Nova obra
        </Texto>

        <Texto variante="corpo" cor={cores.textoSecundario} style={styles.intro}>
          Você entra na obra como responsável técnico automaticamente. Depois de criar, vincule a
          equipe de campo e o cliente.
        </Texto>

        <FormularioObra
          rotuloEnvio="Criar obra"
          onEnviar={async (dados) => {
            const obra = await criar.mutateAsync(dados);
            router.replace(`/obras/${obra.id}`);
          }}
        />
      </Tela>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  teclado: { flex: 1 },
  titulo: { marginTop: espaco.lg },
  intro: { marginTop: espaco.sm, marginBottom: espaco.xl },
});
