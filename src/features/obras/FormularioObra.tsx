import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';
import { z } from 'zod';

import { Botao, Campo, CampoData, Texto } from '@/components/ui';
import { cores, espaco, raio } from '@/theme/tokens';
import type { DadosObra } from './api';

const esquema = z
  .object({
    nome: z.string().trim().min(3, 'Informe o nome da obra'),
    endereco: z.string().trim(),
    contrato: z.string().trim(),
    cliente_nome: z.string().trim(),
    inicio: z.string().nullable(),
    fim_previsto: z.string().nullable(),
  })
  .refine((d) => !d.inicio || !d.fim_previsto || d.fim_previsto >= d.inicio, {
    message: 'A previsão de término não pode ser antes do início',
    path: ['fim_previsto'],
  });

type Formulario = z.infer<typeof esquema>;

type Props = {
  valorInicial?: Partial<DadosObra>;
  rotuloEnvio: string;
  onEnviar: (dados: DadosObra) => Promise<void>;
};

function vazioParaNulo(texto: string): string | null {
  const limpo = texto.trim();
  return limpo.length > 0 ? limpo : null;
}

export function FormularioObra({ valorInicial, rotuloEnvio, onEnviar }: Props) {
  const [erroGeral, setErroGeral] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Formulario>({
    resolver: zodResolver(esquema),
    defaultValues: {
      nome: valorInicial?.nome ?? '',
      endereco: valorInicial?.endereco ?? '',
      contrato: valorInicial?.contrato ?? '',
      cliente_nome: valorInicial?.cliente_nome ?? '',
      inicio: valorInicial?.inicio ?? null,
      fim_previsto: valorInicial?.fim_previsto ?? null,
    },
  });

  async function enviar(dados: Formulario) {
    setErroGeral(null);
    try {
      await onEnviar({
        nome: dados.nome.trim(),
        endereco: vazioParaNulo(dados.endereco),
        contrato: vazioParaNulo(dados.contrato),
        cliente_nome: vazioParaNulo(dados.cliente_nome),
        inicio: dados.inicio,
        fim_previsto: dados.fim_previsto,
      });
    } catch (erro) {
      setErroGeral(erro instanceof Error ? erro.message : 'Não foi possível salvar.');
    }
  }

  return (
    <View style={styles.base}>
      <Controller
        control={control}
        name="nome"
        render={({ field: { onChange, onBlur, value } }) => (
          <Campo
            rotulo="Nome da obra"
            placeholder="Residencial Alfa — Bloco A"
            iconeEsquerda="layers"
            obrigatorio
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            erro={errors.nome?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="endereco"
        render={({ field: { onChange, onBlur, value } }) => (
          <Campo
            rotulo="Endereço"
            placeholder="Av. dos Holandeses, 1200 — São Luís/MA"
            iconeEsquerda="map-pin"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            erro={errors.endereco?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="contrato"
        render={({ field: { onChange, onBlur, value } }) => (
          <Campo
            rotulo="Contrato"
            placeholder="CT-2026-014"
            iconeEsquerda="file-text"
            autoCapitalize="characters"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            ajuda="Número do contrato que ampara esta obra."
            erro={errors.contrato?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="cliente_nome"
        render={({ field: { onChange, onBlur, value } }) => (
          <Campo
            rotulo="Cliente (contratante)"
            placeholder="Alfa Empreendimentos LTDA"
            iconeEsquerda="briefcase"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            erro={errors.cliente_nome?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="inicio"
        render={({ field: { onChange, value } }) => (
          <CampoData
            rotulo="Início"
            valor={value}
            onChange={onChange}
            erro={errors.inicio?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="fim_previsto"
        render={({ field: { onChange, value } }) => (
          <CampoData
            rotulo="Término previsto"
            valor={value}
            onChange={onChange}
            erro={errors.fim_previsto?.message}
          />
        )}
      />

      {erroGeral ? (
        <View style={styles.aviso} accessibilityLiveRegion="polite">
          <Texto variante="auxiliar" cor={cores.erro}>
            {erroGeral}
          </Texto>
        </View>
      ) : null}

      <Botao
        titulo={rotuloEnvio}
        carregando={isSubmitting}
        onPress={() => void handleSubmit(enviar)()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  base: { gap: espaco.lg },
  aviso: {
    backgroundColor: '#FBE9E7',
    borderRadius: raio.sm,
    padding: espaco.md,
  },
});
