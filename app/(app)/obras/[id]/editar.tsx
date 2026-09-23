import { useLocalSearchParams, useRouter } from 'expo-router';
import { KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';

import { ALTURA_BARRA_ABAS } from '@/components/BarraAbas';
import { Botao, Carregando, Tela, Texto } from '@/components/ui';
import { FormularioObra } from '@/features/obras/FormularioObra';
import { useAtualizarObra, useObra } from '@/features/obras/hooks';
import { espaco } from '@/theme/tokens';

export default function EditarObra() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { data: obra, isPending } = useObra(id);
  const atualizar = useAtualizarObra(id);

  if (isPending || !obra) return <Carregando mensagem="Carregando obra" />;

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
          Editar obra
        </Texto>

        <FormularioObra
          valorInicial={obra}
          rotuloEnvio="Salvar alterações"
          onEnviar={async (dados) => {
            await atualizar.mutateAsync(dados);
            router.back();
          }}
        />
      </Tela>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  teclado: { flex: 1 },
  titulo: { marginTop: espaco.lg, marginBottom: espaco.xl },
});
