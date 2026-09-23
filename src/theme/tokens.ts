import type { TextStyle, ViewStyle } from 'react-native';

export const cores = {
  primaria: '#1E3A5F',
  primariaClara: '#2C5182',
  sobrePrimaria: '#FFFFFF',

  destaque: '#F5B301',
  sobreDestaque: '#111827',

  fundo: '#FFFFFF',
  superficie: '#F4F6F9',
  superficieForte: '#E8ECF2',

  texto: '#111827',
  textoSecundario: '#4B5563',
  textoDesabilitado: '#9CA3AF',

  borda: '#E5E7EB',
  bordaForte: '#D1D5DB',

  erro: '#B42318',
  sucesso: '#067647',
  aviso: '#B45309',
  info: '#1E3A5F',

  overlay: 'rgba(17, 24, 39, 0.55)',
} as const;

export const espaco = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const raio = {
  sm: 12,
  md: 20,
  lg: 28,
  pill: 999,
} as const;

export const fontes = {
  regular: 'PlusJakartaSans_400Regular',
  media: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
} as const;

export const tamanhoFonte = {
  xs: 12,
  sm: 14,
  base: 16,
  md: 18,
  lg: 20,
  xl: 24,
  display: 32,
} as const;

export const tipografia = {
  display: {
    fontFamily: fontes.bold,
    fontSize: tamanhoFonte.display,
    lineHeight: 38,
    letterSpacing: -0.8,
  },
  titulo: {
    fontFamily: fontes.bold,
    fontSize: tamanhoFonte.xl,
    lineHeight: 30,
    letterSpacing: -0.4,
  },
  subtitulo: {
    fontFamily: fontes.semibold,
    fontSize: tamanhoFonte.lg,
    lineHeight: 26,
    letterSpacing: -0.2,
  },
  corpoForte: {
    fontFamily: fontes.semibold,
    fontSize: tamanhoFonte.base,
    lineHeight: 22,
  },
  corpo: {
    fontFamily: fontes.regular,
    fontSize: tamanhoFonte.base,
    lineHeight: 22,
  },
  auxiliar: {
    fontFamily: fontes.media,
    fontSize: tamanhoFonte.sm,
    lineHeight: 20,
  },
  rotulo: {
    fontFamily: fontes.semibold,
    fontSize: tamanhoFonte.xs,
    lineHeight: 16,
    letterSpacing: 0.4,
  },
} satisfies Record<string, TextStyle>;

export const sombra = {
  cartao: {
    shadowColor: '#0B1F35',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  flutuante: {
    shadowColor: '#0B1F35',
    shadowOpacity: 0.16,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
} satisfies Record<string, ViewStyle>;

/** Altura mínima de qualquer alvo tocável (requisito de acessibilidade do projeto). */
export const ALVO_TOQUE = 48;

export const icone = {
  sm: 18,
  md: 22,
  lg: 26,
} as const;

export const tema = {
  cores,
  espaco,
  raio,
  fontes,
  tamanhoFonte,
  tipografia,
  sombra,
  icone,
  ALVO_TOQUE,
} as const;

export type Tema = typeof tema;
