// GERADO AUTOMATICAMENTE POR scripts/gen-types.ts — NÃO EDITE À MÃO.
// Para atualizar depois de uma migração: npm run db:types

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      assinaturas: {
        Row: {
          id: string;
          rdo_id: string;
          usuario_id: string;
          tipo: Database['public']['Enums']['tipo_assinatura'];
          ressalva: string | null;
          versao: number;
          declaracao_texto: string;
          dispositivo: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          rdo_id: string;
          usuario_id: string;
          tipo: Database['public']['Enums']['tipo_assinatura'];
          ressalva?: string | null;
          versao: number;
          declaracao_texto: string;
          dispositivo?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          rdo_id?: string;
          usuario_id?: string;
          tipo?: Database['public']['Enums']['tipo_assinatura'];
          ressalva?: string | null;
          versao?: number;
          declaracao_texto?: string;
          dispositivo?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'assinaturas_rdo_id_fkey';
            columns: ['rdo_id'];
            isOneToOne: false;
            referencedRelation: 'rdos';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'assinaturas_usuario_id_fkey';
            columns: ['usuario_id'];
            isOneToOne: false;
            referencedRelation: 'perfis';
            referencedColumns: ['id'];
          },
        ];
      };
      auditoria: {
        Row: {
          id: number;
          empresa_id: string | null;
          ator_id: string | null;
          acao: string;
          tabela: string;
          registro_id: string | null;
          antes: Json | null;
          depois: Json | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          empresa_id?: string | null;
          ator_id?: string | null;
          acao: string;
          tabela: string;
          registro_id?: string | null;
          antes?: Json | null;
          depois?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          empresa_id?: string | null;
          ator_id?: string | null;
          acao?: string;
          tabela?: string;
          registro_id?: string | null;
          antes?: Json | null;
          depois?: Json | null;
          created_at?: string;
        };
        Relationships: [];
      };
      comentarios: {
        Row: {
          id: string;
          rdo_id: string;
          autor_id: string;
          alvo_tipo: string;
          alvo_id: string | null;
          texto: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          rdo_id: string;
          autor_id: string;
          alvo_tipo?: string;
          alvo_id?: string | null;
          texto: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          rdo_id?: string;
          autor_id?: string;
          alvo_tipo?: string;
          alvo_id?: string | null;
          texto?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'comentarios_autor_id_fkey';
            columns: ['autor_id'];
            isOneToOne: false;
            referencedRelation: 'perfis';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'comentarios_rdo_id_fkey';
            columns: ['rdo_id'];
            isOneToOne: false;
            referencedRelation: 'rdos';
            referencedColumns: ['id'];
          },
        ];
      };
      empresas: {
        Row: {
          id: string;
          razao_social: string;
          cnpj: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          razao_social: string;
          cnpj?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          razao_social?: string;
          cnpj?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      notificacoes: {
        Row: {
          id: string;
          usuario_id: string;
          rdo_id: string | null;
          tipo: string;
          titulo: string;
          corpo: string | null;
          lida: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          usuario_id: string;
          rdo_id?: string | null;
          tipo: string;
          titulo: string;
          corpo?: string | null;
          lida?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          usuario_id?: string;
          rdo_id?: string | null;
          tipo?: string;
          titulo?: string;
          corpo?: string | null;
          lida?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'notificacoes_rdo_id_fkey';
            columns: ['rdo_id'];
            isOneToOne: false;
            referencedRelation: 'rdos';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'notificacoes_usuario_id_fkey';
            columns: ['usuario_id'];
            isOneToOne: false;
            referencedRelation: 'perfis';
            referencedColumns: ['id'];
          },
        ];
      };
      obra_membros: {
        Row: {
          obra_id: string;
          usuario_id: string;
          papel: Database['public']['Enums']['papel_usuario'];
          created_at: string;
        };
        Insert: {
          obra_id: string;
          usuario_id: string;
          papel: Database['public']['Enums']['papel_usuario'];
          created_at?: string;
        };
        Update: {
          obra_id?: string;
          usuario_id?: string;
          papel?: Database['public']['Enums']['papel_usuario'];
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'obra_membros_obra_id_fkey';
            columns: ['obra_id'];
            isOneToOne: false;
            referencedRelation: 'obras';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'obra_membros_usuario_id_fkey';
            columns: ['usuario_id'];
            isOneToOne: false;
            referencedRelation: 'perfis';
            referencedColumns: ['id'];
          },
        ];
      };
      obras: {
        Row: {
          id: string;
          empresa_id: string;
          nome: string;
          endereco: string | null;
          contrato: string | null;
          cliente_nome: string | null;
          inicio: string | null;
          fim_previsto: string | null;
          fuso: string;
          ativa: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          empresa_id: string;
          nome: string;
          endereco?: string | null;
          contrato?: string | null;
          cliente_nome?: string | null;
          inicio?: string | null;
          fim_previsto?: string | null;
          fuso?: string;
          ativa?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          empresa_id?: string;
          nome?: string;
          endereco?: string | null;
          contrato?: string | null;
          cliente_nome?: string | null;
          inicio?: string | null;
          fim_previsto?: string | null;
          fuso?: string;
          ativa?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'obras_empresa_id_fkey';
            columns: ['empresa_id'];
            isOneToOne: false;
            referencedRelation: 'empresas';
            referencedColumns: ['id'];
          },
        ];
      };
      perfis: {
        Row: {
          id: string;
          empresa_id: string;
          nome: string;
          email: string;
          papel: Database['public']['Enums']['papel_usuario'];
          ativo: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          empresa_id: string;
          nome: string;
          email: string;
          papel: Database['public']['Enums']['papel_usuario'];
          ativo?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          empresa_id?: string;
          nome?: string;
          email?: string;
          papel?: Database['public']['Enums']['papel_usuario'];
          ativo?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'perfis_empresa_id_fkey';
            columns: ['empresa_id'];
            isOneToOne: false;
            referencedRelation: 'empresas';
            referencedColumns: ['id'];
          },
        ];
      };
      rdo_atividades: {
        Row: {
          id: string;
          rdo_id: string;
          local: string | null;
          servico: string;
          descricao: string | null;
          unidade: string | null;
          quantidade_dia: number | null;
          percentual: number | null;
          situacao: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          rdo_id: string;
          local?: string | null;
          servico: string;
          descricao?: string | null;
          unidade?: string | null;
          quantidade_dia?: number | null;
          percentual?: number | null;
          situacao?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          rdo_id?: string;
          local?: string | null;
          servico?: string;
          descricao?: string | null;
          unidade?: string | null;
          quantidade_dia?: number | null;
          percentual?: number | null;
          situacao?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'rdo_atividades_rdo_id_fkey';
            columns: ['rdo_id'];
            isOneToOne: false;
            referencedRelation: 'rdos';
            referencedColumns: ['id'];
          },
        ];
      };
      rdo_clima: {
        Row: {
          id: string;
          rdo_id: string;
          periodo: string;
          condicao: Database['public']['Enums']['condicao_tempo'];
          temperatura_c: number | null;
          choveu: boolean;
          chuva_duracao_min: number | null;
          chuva_impacto: string | null;
          precipitacao_mm: number | null;
          horas_paralisadas: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          rdo_id: string;
          periodo: string;
          condicao: Database['public']['Enums']['condicao_tempo'];
          temperatura_c?: number | null;
          choveu?: boolean;
          chuva_duracao_min?: number | null;
          chuva_impacto?: string | null;
          precipitacao_mm?: number | null;
          horas_paralisadas?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          rdo_id?: string;
          periodo?: string;
          condicao?: Database['public']['Enums']['condicao_tempo'];
          temperatura_c?: number | null;
          choveu?: boolean;
          chuva_duracao_min?: number | null;
          chuva_impacto?: string | null;
          precipitacao_mm?: number | null;
          horas_paralisadas?: number | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'rdo_clima_rdo_id_fkey';
            columns: ['rdo_id'];
            isOneToOne: false;
            referencedRelation: 'rdos';
            referencedColumns: ['id'];
          },
        ];
      };
      rdo_equipamentos: {
        Row: {
          id: string;
          rdo_id: string;
          tipo: string;
          identificacao: string | null;
          quantidade: number;
          horas_produtivas: number;
          horas_paradas: number;
          motivo_parada: string | null;
          operador: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          rdo_id: string;
          tipo: string;
          identificacao?: string | null;
          quantidade?: number;
          horas_produtivas?: number;
          horas_paradas?: number;
          motivo_parada?: string | null;
          operador?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          rdo_id?: string;
          tipo?: string;
          identificacao?: string | null;
          quantidade?: number;
          horas_produtivas?: number;
          horas_paradas?: number;
          motivo_parada?: string | null;
          operador?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'rdo_equipamentos_rdo_id_fkey';
            columns: ['rdo_id'];
            isOneToOne: false;
            referencedRelation: 'rdos';
            referencedColumns: ['id'];
          },
        ];
      };
      rdo_fotos: {
        Row: {
          id: string;
          rdo_id: string;
          storage_path: string;
          legenda: string;
          atividade_id: string | null;
          ocorrencia_id: string | null;
          autor_id: string;
          capturada_em: string | null;
          comprimida: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          rdo_id: string;
          storage_path: string;
          legenda: string;
          atividade_id?: string | null;
          ocorrencia_id?: string | null;
          autor_id: string;
          capturada_em?: string | null;
          comprimida?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          rdo_id?: string;
          storage_path?: string;
          legenda?: string;
          atividade_id?: string | null;
          ocorrencia_id?: string | null;
          autor_id?: string;
          capturada_em?: string | null;
          comprimida?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'rdo_fotos_atividade_id_fkey';
            columns: ['atividade_id'];
            isOneToOne: false;
            referencedRelation: 'rdo_atividades';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'rdo_fotos_autor_id_fkey';
            columns: ['autor_id'];
            isOneToOne: false;
            referencedRelation: 'perfis';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'rdo_fotos_ocorrencia_id_fkey';
            columns: ['ocorrencia_id'];
            isOneToOne: false;
            referencedRelation: 'rdo_ocorrencias';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'rdo_fotos_rdo_id_fkey';
            columns: ['rdo_id'];
            isOneToOne: false;
            referencedRelation: 'rdos';
            referencedColumns: ['id'];
          },
        ];
      };
      rdo_mao_obra: {
        Row: {
          id: string;
          rdo_id: string;
          equipe: string | null;
          funcao: string;
          quantidade: number;
          horas: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          rdo_id: string;
          equipe?: string | null;
          funcao: string;
          quantidade: number;
          horas: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          rdo_id?: string;
          equipe?: string | null;
          funcao?: string;
          quantidade?: number;
          horas?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'rdo_mao_obra_rdo_id_fkey';
            columns: ['rdo_id'];
            isOneToOne: false;
            referencedRelation: 'rdos';
            referencedColumns: ['id'];
          },
        ];
      };
      rdo_ocorrencias: {
        Row: {
          id: string;
          rdo_id: string;
          descricao: string;
          horario: string | null;
          impacto: string | null;
          acao_imediata: string | null;
          responsavel: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          rdo_id: string;
          descricao: string;
          horario?: string | null;
          impacto?: string | null;
          acao_imediata?: string | null;
          responsavel?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          rdo_id?: string;
          descricao?: string;
          horario?: string | null;
          impacto?: string | null;
          acao_imediata?: string | null;
          responsavel?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'rdo_ocorrencias_rdo_id_fkey';
            columns: ['rdo_id'];
            isOneToOne: false;
            referencedRelation: 'rdos';
            referencedColumns: ['id'];
          },
        ];
      };
      rdo_pendencias: {
        Row: {
          id: string;
          rdo_id: string;
          descricao: string;
          responsavel: string | null;
          prazo: string | null;
          criticidade: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          rdo_id: string;
          descricao: string;
          responsavel?: string | null;
          prazo?: string | null;
          criticidade?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          rdo_id?: string;
          descricao?: string;
          responsavel?: string | null;
          prazo?: string | null;
          criticidade?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'rdo_pendencias_rdo_id_fkey';
            columns: ['rdo_id'];
            isOneToOne: false;
            referencedRelation: 'rdos';
            referencedColumns: ['id'];
          },
        ];
      };
      rdo_versoes: {
        Row: {
          id: string;
          rdo_id: string;
          versao: number;
          snapshot: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          rdo_id: string;
          versao: number;
          snapshot: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          rdo_id?: string;
          versao?: number;
          snapshot?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'rdo_versoes_rdo_id_fkey';
            columns: ['rdo_id'];
            isOneToOne: false;
            referencedRelation: 'rdos';
            referencedColumns: ['id'];
          },
        ];
      };
      rdos: {
        Row: {
          id: string;
          empresa_id: string;
          obra_id: string;
          numero: number;
          data: string;
          turno: Database['public']['Enums']['turno'];
          status: Database['public']['Enums']['status_rdo'];
          autor_id: string;
          versao: number;
          rdo_origem_id: string | null;
          motivo_retificacao: string | null;
          sem_producao_justificativa: string | null;
          declaracao_aceita: boolean;
          devolucao_motivo: string | null;
          pdf_path: string | null;
          pdf_hash: string | null;
          submetido_em: string | null;
          validado_em: string | null;
          finalizado_em: string | null;
          cancelado_em: string | null;
          cancelamento_motivo: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          empresa_id: string;
          obra_id: string;
          numero: number;
          data: string;
          turno: Database['public']['Enums']['turno'];
          status?: Database['public']['Enums']['status_rdo'];
          autor_id: string;
          versao?: number;
          rdo_origem_id?: string | null;
          motivo_retificacao?: string | null;
          sem_producao_justificativa?: string | null;
          declaracao_aceita?: boolean;
          devolucao_motivo?: string | null;
          pdf_path?: string | null;
          pdf_hash?: string | null;
          submetido_em?: string | null;
          validado_em?: string | null;
          finalizado_em?: string | null;
          cancelado_em?: string | null;
          cancelamento_motivo?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          empresa_id?: string;
          obra_id?: string;
          numero?: number;
          data?: string;
          turno?: Database['public']['Enums']['turno'];
          status?: Database['public']['Enums']['status_rdo'];
          autor_id?: string;
          versao?: number;
          rdo_origem_id?: string | null;
          motivo_retificacao?: string | null;
          sem_producao_justificativa?: string | null;
          declaracao_aceita?: boolean;
          devolucao_motivo?: string | null;
          pdf_path?: string | null;
          pdf_hash?: string | null;
          submetido_em?: string | null;
          validado_em?: string | null;
          finalizado_em?: string | null;
          cancelado_em?: string | null;
          cancelamento_motivo?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'rdos_autor_id_fkey';
            columns: ['autor_id'];
            isOneToOne: false;
            referencedRelation: 'perfis';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'rdos_empresa_id_fkey';
            columns: ['empresa_id'];
            isOneToOne: false;
            referencedRelation: 'empresas';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'rdos_obra_id_fkey';
            columns: ['obra_id'];
            isOneToOne: false;
            referencedRelation: 'obras';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'rdos_rdo_origem_id_fkey';
            columns: ['rdo_origem_id'];
            isOneToOne: false;
            referencedRelation: 'rdos';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      fn_auditoria: {
        Args: Record<string, never>;
        Returns: unknown;
      };
      fn_auditoria_imutavel: {
        Args: Record<string, never>;
        Returns: unknown;
      };
      fn_bloqueia_alteracao_rdo: {
        Args: Record<string, never>;
        Returns: unknown;
      };
      fn_bloqueia_delete_rdo: {
        Args: Record<string, never>;
        Returns: unknown;
      };
      fn_bloqueia_edicao_filha: {
        Args: Record<string, never>;
        Returns: unknown;
      };
      fn_eh_master_da_empresa: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      fn_eh_membro: {
        Args: {
          p_obra_id: string;
        };
        Returns: boolean;
      };
      fn_empresa_do_usuario: {
        Args: Record<string, never>;
        Returns: string;
      };
      fn_exige_membro: {
        Args: {
          p_rdo_id: string;
        };
        Returns: Database['public']['Tables']['rdos']['Row'];
      };
      fn_marca_updated_at: {
        Args: Record<string, never>;
        Returns: unknown;
      };
      fn_notificar: {
        Args: {
          p_usuario_id: string;
          p_rdo_id: string;
          p_tipo: string;
          p_titulo: string;
          p_corpo: string;
        };
        Returns: undefined;
      };
      fn_notificar_papel: {
        Args: {
          p_obra_id: string;
          p_papel: Database['public']['Enums']['papel_usuario'];
          p_rdo_id: string;
          p_tipo: string;
          p_titulo: string;
          p_corpo: string;
        };
        Returns: undefined;
      };
      fn_obra_do_caminho: {
        Args: {
          p_name: string;
        };
        Returns: string;
      };
      fn_papel_na_obra: {
        Args: {
          p_obra_id: string;
        };
        Returns: Database['public']['Enums']['papel_usuario'];
      };
      fn_rdo_do_caminho: {
        Args: {
          p_name: string;
        };
        Returns: string;
      };
      fn_rdo_editavel: {
        Args: {
          p_rdo_id: string;
        };
        Returns: boolean;
      };
      fn_rdo_snapshot: {
        Args: {
          p_rdo_id: string;
        };
        Returns: Json;
      };
      fn_rdo_visivel: {
        Args: {
          p_rdo_id: string;
        };
        Returns: boolean;
      };
      fn_registro_imutavel: {
        Args: Record<string, never>;
        Returns: unknown;
      };
      fn_vincula_criador_da_obra: {
        Args: Record<string, never>;
        Returns: unknown;
      };
      obra_criar: {
        Args: {
          p_nome: string;
          p_endereco: string;
          p_contrato: string;
          p_cliente_nome: string;
          p_inicio: string;
          p_fim_previsto: string;
        };
        Returns: Database['public']['Tables']['obras']['Row'];
      };
      painel_master: {
        Args: Record<string, never>;
        Returns: Json;
      };
      rdo_auditoria: {
        Args: {
          p_rdo_id: string;
        };
        Returns: { id: number; quando: string; acao: string; tabela: string; ator: string; antes: Json; depois: Json }[];
      };
      rdo_cancelar: {
        Args: {
          p_rdo_id: string;
          p_motivo: string;
        };
        Returns: Database['public']['Tables']['rdos']['Row'];
      };
      rdo_cliente_assinar: {
        Args: {
          p_rdo_id: string;
          p_com_ressalva: boolean;
          p_ressalva: string;
          p_declaracao_texto: string;
          p_dispositivo: string;
        };
        Returns: Database['public']['Tables']['rdos']['Row'];
      };
      rdo_cliente_pedir_esclarecimento: {
        Args: {
          p_rdo_id: string;
          p_texto: string;
        };
        Returns: Database['public']['Tables']['rdos']['Row'];
      };
      rdo_criar: {
        Args: {
          p_obra_id: string;
          p_data: string;
          p_turno: Database['public']['Enums']['turno'];
          p_id?: string;
        };
        Returns: Database['public']['Tables']['rdos']['Row'];
      };
      rdo_devolver: {
        Args: {
          p_rdo_id: string;
          p_motivo: string;
        };
        Returns: Database['public']['Tables']['rdos']['Row'];
      };
      rdo_iniciar_analise: {
        Args: {
          p_rdo_id: string;
        };
        Returns: Database['public']['Tables']['rdos']['Row'];
      };
      rdo_registrar_pdf: {
        Args: {
          p_rdo_id: string;
          p_path: string;
          p_hash: string;
        };
        Returns: Database['public']['Tables']['rdos']['Row'];
      };
      rdo_retificar: {
        Args: {
          p_rdo_id: string;
          p_motivo: string;
        };
        Returns: Database['public']['Tables']['rdos']['Row'];
      };
      rdo_salvar_rascunho: {
        Args: {
          p_rdo_id: string;
          p_payload: Json;
        };
        Returns: Database['public']['Tables']['rdos']['Row'];
      };
      rdo_submeter: {
        Args: {
          p_rdo_id: string;
        };
        Returns: Database['public']['Tables']['rdos']['Row'];
      };
      rdo_validar: {
        Args: {
          p_rdo_id: string;
          p_declaracao_texto: string;
          p_dispositivo: string;
        };
        Returns: Database['public']['Tables']['rdos']['Row'];
      };
    };
    Enums: {
      condicao_tempo: 'sol' | 'nublado' | 'chuva_fraca' | 'chuva_forte' | 'impraticavel';
      papel_usuario: 'master' | 'operacional' | 'cliente';
      status_rdo: 'rascunho' | 'submetido' | 'em_analise' | 'validado' | 'enviado_cliente' | 'finalizado' | 'retificado' | 'cancelado';
      tipo_assinatura: 'validacao_master' | 'ciencia_cliente' | 'ciencia_cliente_com_ressalva';
      turno: 'manha' | 'tarde' | 'noite' | 'integral';
    };
    CompositeTypes: Record<string, never>;
  };
};

export type Tabelas<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

export type Enums<T extends keyof Database['public']['Enums']> =
  Database['public']['Enums'][T];
