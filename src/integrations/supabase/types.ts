export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      _encryption_keys: {
        Row: {
          id: number
          key_value: string
        }
        Insert: {
          id?: number
          key_value: string
        }
        Update: {
          id?: number
          key_value?: string
        }
        Relationships: []
      }
      admin_accounts: {
        Row: {
          ativo: boolean | null
          cpf: string
          cpf_hash: string | null
          created_at: string | null
          id: string
          nome: string
          senha_hash: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          cpf: string
          cpf_hash?: string | null
          created_at?: string | null
          id?: string
          nome: string
          senha_hash: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          cpf?: string
          cpf_hash?: string | null
          created_at?: string | null
          id?: string
          nome?: string
          senha_hash?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          acao: string
          created_at: string
          detalhes: string | null
          entidade: string | null
          entidade_id: string | null
          id: string
          solicitacao_id: string
          usuario_id: string
        }
        Insert: {
          acao: string
          created_at?: string
          detalhes?: string | null
          entidade?: string | null
          entidade_id?: string | null
          id?: string
          solicitacao_id: string
          usuario_id: string
        }
        Update: {
          acao?: string
          created_at?: string
          detalhes?: string | null
          entidade?: string | null
          entidade_id?: string | null
          id?: string
          solicitacao_id?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_solicitacao_id_fkey"
            columns: ["solicitacao_id"]
            isOneToOne: false
            referencedRelation: "solicitacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_solicitacao_id_fkey"
            columns: ["solicitacao_id"]
            isOneToOne: false
            referencedRelation: "solicitacoes_v"
            referencedColumns: ["id"]
          },
        ]
      }
      banco_perguntas: {
        Row: {
          ativo: boolean
          config: Json | null
          created_at: string
          descricao: string | null
          id: string
          opcoes: Json | null
          placeholder: string | null
          rotulo: string
          tipo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          config?: Json | null
          created_at?: string
          descricao?: string | null
          id?: string
          opcoes?: Json | null
          placeholder?: string | null
          rotulo: string
          tipo?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          config?: Json | null
          created_at?: string
          descricao?: string | null
          id?: string
          opcoes?: Json | null
          placeholder?: string | null
          rotulo?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: []
      }
      campos_analise: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          nome: string
          obrigatorio: boolean
          opcoes: Json | null
          ordem: number
          servico_ids: string[]
          tipo: string
          updated_at: string
          visivel_externo: boolean
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome: string
          obrigatorio?: boolean
          opcoes?: Json | null
          ordem?: number
          servico_ids?: string[]
          tipo?: string
          updated_at?: string
          visivel_externo?: boolean
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome?: string
          obrigatorio?: boolean
          opcoes?: Json | null
          ordem?: number
          servico_ids?: string[]
          tipo?: string
          updated_at?: string
          visivel_externo?: boolean
        }
        Relationships: []
      }
      campos_analise_valores: {
        Row: {
          campo_id: string
          created_at: string
          id: string
          solicitacao_id: string
          updated_at: string
          valor: string | null
        }
        Insert: {
          campo_id: string
          created_at?: string
          id?: string
          solicitacao_id: string
          updated_at?: string
          valor?: string | null
        }
        Update: {
          campo_id?: string
          created_at?: string
          id?: string
          solicitacao_id?: string
          updated_at?: string
          valor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campos_analise_valores_campo_id_fkey"
            columns: ["campo_id"]
            isOneToOne: false
            referencedRelation: "campos_analise"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campos_analise_valores_solicitacao_id_fkey"
            columns: ["solicitacao_id"]
            isOneToOne: false
            referencedRelation: "solicitacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campos_analise_valores_solicitacao_id_fkey"
            columns: ["solicitacao_id"]
            isOneToOne: false
            referencedRelation: "solicitacoes_v"
            referencedColumns: ["id"]
          },
        ]
      }
      campos_fixos_config: {
        Row: {
          ativo: boolean
          campo_chave: string
          campo_label: string
          created_at: string
          id: string
          obrigatorio_analise: boolean
          ordem: number
          servico_ids: string[]
          updated_at: string
          visivel_analise: boolean
          visivel_externo: boolean
        }
        Insert: {
          ativo?: boolean
          campo_chave: string
          campo_label: string
          created_at?: string
          id?: string
          obrigatorio_analise?: boolean
          ordem?: number
          servico_ids?: string[]
          updated_at?: string
          visivel_analise?: boolean
          visivel_externo?: boolean
        }
        Update: {
          ativo?: boolean
          campo_chave?: string
          campo_label?: string
          created_at?: string
          id?: string
          obrigatorio_analise?: boolean
          ordem?: number
          servico_ids?: string[]
          updated_at?: string
          visivel_analise?: boolean
          visivel_externo?: boolean
        }
        Relationships: []
      }
      cancelamento_recusa_config: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          servico_ids: string[]
          status_habilitados: string[]
          tipo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          servico_ids?: string[]
          status_habilitados?: string[]
          tipo: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          servico_ids?: string[]
          status_habilitados?: string[]
          tipo?: string
          updated_at?: string
        }
        Relationships: []
      }
      consulta_etapas_config: {
        Row: {
          ativo: boolean
          chave: string
          created_at: string
          descricao: string | null
          etapa_equivalente: string | null
          grupo: string
          id: string
          ordem: number
          servico_ids: string[]
          status_gatilho: string[] | null
          tipo: string
          titulo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          chave: string
          created_at?: string
          descricao?: string | null
          etapa_equivalente?: string | null
          grupo?: string
          id?: string
          ordem?: number
          servico_ids?: string[]
          status_gatilho?: string[] | null
          tipo?: string
          titulo: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          chave?: string
          created_at?: string
          descricao?: string | null
          etapa_equivalente?: string | null
          grupo?: string
          id?: string
          ordem?: number
          servico_ids?: string[]
          status_gatilho?: string[] | null
          tipo?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: []
      }
      deferimento_documents: {
        Row: {
          created_at: string
          document_type: string
          file_name: string
          file_url: string
          id: string
          motivo_recusa: string | null
          solicitacao_id: string
          status: string | null
        }
        Insert: {
          created_at?: string
          document_type?: string
          file_name: string
          file_url: string
          id?: string
          motivo_recusa?: string | null
          solicitacao_id: string
          status?: string | null
        }
        Update: {
          created_at?: string
          document_type?: string
          file_name?: string
          file_url?: string
          id?: string
          motivo_recusa?: string | null
          solicitacao_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deferimento_documents_solicitacao_id_fkey"
            columns: ["solicitacao_id"]
            isOneToOne: false
            referencedRelation: "solicitacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deferimento_documents_solicitacao_id_fkey"
            columns: ["solicitacao_id"]
            isOneToOne: false
            referencedRelation: "solicitacoes_v"
            referencedColumns: ["id"]
          },
        ]
      }
      deferimento_titulos: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          servico_ids: string[]
          titulo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          servico_ids?: string[]
          titulo: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          servico_ids?: string[]
          titulo?: string
          updated_at?: string
        }
        Relationships: []
      }
      estilos_formulario: {
        Row: {
          ativo: boolean
          chave: string
          config: Json
          created_at: string
          descricao: string | null
          features: string[]
          id: string
          nome: string
          ordem: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          chave: string
          config?: Json
          created_at?: string
          descricao?: string | null
          features?: string[]
          id?: string
          nome: string
          ordem?: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          chave?: string
          config?: Json
          created_at?: string
          descricao?: string | null
          features?: string[]
          id?: string
          nome?: string
          ordem?: number
          updated_at?: string
        }
        Relationships: []
      }
      external_buttons: {
        Row: {
          abrir_nova_aba: boolean | null
          ativo: boolean
          created_at: string
          descricao: string | null
          formulario_id: string | null
          icone: string | null
          id: string
          ordem: number
          tipo: string
          titulo: string
          updated_at: string
          url: string | null
        }
        Insert: {
          abrir_nova_aba?: boolean | null
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          formulario_id?: string | null
          icone?: string | null
          id?: string
          ordem?: number
          tipo?: string
          titulo: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          abrir_nova_aba?: boolean | null
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          formulario_id?: string | null
          icone?: string | null
          id?: string
          ordem?: number
          tipo?: string
          titulo?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "external_buttons_formulario_id_fkey"
            columns: ["formulario_id"]
            isOneToOne: false
            referencedRelation: "formularios"
            referencedColumns: ["id"]
          },
        ]
      }
      cobrancas: {
        Row: {
          cobranca_config_id: string | null
          confirmado: boolean
          confirmado_data: string | null
          confirmado_por: string | null
          created_at: string
          id: string
          origem: string
          solicitacao_id: string
          status_financeiro: string
          updated_at: string
        }
        Insert: {
          cobranca_config_id?: string | null
          confirmado?: boolean
          confirmado_data?: string | null
          confirmado_por?: string | null
          created_at?: string
          id?: string
          origem?: string
          solicitacao_id: string
          status_financeiro?: string
          updated_at?: string
        }
        Update: {
          cobranca_config_id?: string | null
          confirmado?: boolean
          confirmado_data?: string | null
          confirmado_por?: string | null
          created_at?: string
          id?: string
          origem?: string
          solicitacao_id?: string
          status_financeiro?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cobrancas_cobranca_config_id_fkey"
            columns: ["cobranca_config_id"]
            isOneToOne: false
            referencedRelation: "lancamento_cobranca_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cobrancas_solicitacao_id_fkey"
            columns: ["solicitacao_id"]
            isOneToOne: false
            referencedRelation: "solicitacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cobrancas_solicitacao_id_fkey"
            columns: ["solicitacao_id"]
            isOneToOne: false
            referencedRelation: "solicitacoes_v"
            referencedColumns: ["id"]
          },
        ]
      }
      form_data: {
        Row: {
          arquivos: Json | null
          created_at: string
          formulario_id: string
          id: string
          ip_address: string | null
          legacy_formulario_resposta_id: string | null
          respostas: Json
        }
        Insert: {
          arquivos?: Json | null
          created_at?: string
          formulario_id: string
          id?: string
          ip_address?: string | null
          legacy_formulario_resposta_id?: string | null
          respostas: Json
        }
        Update: {
          arquivos?: Json | null
          created_at?: string
          formulario_id?: string
          id?: string
          ip_address?: string | null
          legacy_formulario_resposta_id?: string | null
          respostas?: Json
        }
        Relationships: [
          {
            foreignKeyName: "form_data_formulario_id_fkey"
            columns: ["formulario_id"]
            isOneToOne: false
            referencedRelation: "formularios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_data_legacy_formulario_resposta_id_fkey"
            columns: ["legacy_formulario_resposta_id"]
            isOneToOne: false
            referencedRelation: "formulario_respostas"
            referencedColumns: ["id"]
          },
        ]
      }
      form_field_mapping: {
        Row: {
          created_at: string
          form_field_id: string
          formulario_id: string
          id: string
          legacy_formulario_pergunta_id: string | null
          obrigatorio: boolean
          ordem: number
        }
        Insert: {
          created_at?: string
          form_field_id: string
          formulario_id: string
          id?: string
          legacy_formulario_pergunta_id?: string | null
          obrigatorio?: boolean
          ordem?: number
        }
        Update: {
          created_at?: string
          form_field_id?: string
          formulario_id?: string
          id?: string
          legacy_formulario_pergunta_id?: string | null
          obrigatorio?: boolean
          ordem?: number
        }
        Relationships: [
          {
            foreignKeyName: "form_field_mapping_form_field_id_fkey"
            columns: ["form_field_id"]
            isOneToOne: false
            referencedRelation: "form_fields"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_field_mapping_formulario_id_fkey"
            columns: ["formulario_id"]
            isOneToOne: false
            referencedRelation: "formularios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_field_mapping_legacy_formulario_pergunta_id_fkey"
            columns: ["legacy_formulario_pergunta_id"]
            isOneToOne: false
            referencedRelation: "formulario_perguntas"
            referencedColumns: ["id"]
          },
        ]
      }
      form_fields: {
        Row: {
          ativo: boolean
          config: Json | null
          created_at: string
          descricao: string | null
          id: string
          legacy_pergunta_id: string | null
          opcoes: Json | null
          placeholder: string | null
          rotulo: string
          tipo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          config?: Json | null
          created_at?: string
          descricao?: string | null
          id?: string
          legacy_pergunta_id?: string | null
          opcoes?: Json | null
          placeholder?: string | null
          rotulo: string
          tipo?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          config?: Json | null
          created_at?: string
          descricao?: string | null
          id?: string
          legacy_pergunta_id?: string | null
          opcoes?: Json | null
          placeholder?: string | null
          rotulo?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_fields_legacy_pergunta_id_fkey"
            columns: ["legacy_pergunta_id"]
            isOneToOne: false
            referencedRelation: "banco_perguntas"
            referencedColumns: ["id"]
          },
        ]
      }
      field_mappings: {
        Row: {
          campo_externo: string
          campo_interno: string
          created_at: string
          descricao: string | null
          direcao: string
          id: string
          integracao_id: string | null
          sistema: string | null
        }
        Insert: {
          campo_externo: string
          campo_interno: string
          created_at?: string
          descricao?: string | null
          direcao?: string
          id?: string
          integracao_id?: string | null
          sistema?: string | null
        }
        Update: {
          campo_externo?: string
          campo_interno?: string
          created_at?: string
          descricao?: string | null
          direcao?: string
          id?: string
          integracao_id?: string | null
          sistema?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "field_mappings_integracao_id_fkey"
            columns: ["integracao_id"]
            isOneToOne: false
            referencedRelation: "integracoes"
            referencedColumns: ["id"]
          },
        ]
      }
      formulario_campos: {
        Row: {
          condicao: Json | null
          created_at: string
          formulario_id: string
          id: string
          obrigatorio: boolean
          opcoes: Json | null
          ordem: number
          placeholder: string | null
          rotulo: string
          tipo: string
        }
        Insert: {
          condicao?: Json | null
          created_at?: string
          formulario_id: string
          id?: string
          obrigatorio?: boolean
          opcoes?: Json | null
          ordem?: number
          placeholder?: string | null
          rotulo: string
          tipo: string
        }
        Update: {
          condicao?: Json | null
          created_at?: string
          formulario_id?: string
          id?: string
          obrigatorio?: boolean
          opcoes?: Json | null
          ordem?: number
          placeholder?: string | null
          rotulo?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "formulario_campos_formulario_id_fkey"
            columns: ["formulario_id"]
            isOneToOne: false
            referencedRelation: "formularios"
            referencedColumns: ["id"]
          },
        ]
      }
      formulario_perguntas: {
        Row: {
          created_at: string
          formulario_id: string
          id: string
          obrigatorio: boolean
          ordem: number
          pergunta_id: string
        }
        Insert: {
          created_at?: string
          formulario_id: string
          id?: string
          obrigatorio?: boolean
          ordem?: number
          pergunta_id: string
        }
        Update: {
          created_at?: string
          formulario_id?: string
          id?: string
          obrigatorio?: boolean
          ordem?: number
          pergunta_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "formulario_perguntas_formulario_id_fkey"
            columns: ["formulario_id"]
            isOneToOne: false
            referencedRelation: "formularios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "formulario_perguntas_pergunta_id_fkey"
            columns: ["pergunta_id"]
            isOneToOne: false
            referencedRelation: "banco_perguntas"
            referencedColumns: ["id"]
          },
        ]
      }
      formulario_respostas: {
        Row: {
          arquivos: Json | null
          created_at: string
          formulario_id: string
          id: string
          ip_address: string | null
          respostas: Json
        }
        Insert: {
          arquivos?: Json | null
          created_at?: string
          formulario_id: string
          id?: string
          ip_address?: string | null
          respostas: Json
        }
        Update: {
          arquivos?: Json | null
          created_at?: string
          formulario_id?: string
          id?: string
          ip_address?: string | null
          respostas?: Json
        }
        Relationships: [
          {
            foreignKeyName: "formulario_respostas_formulario_id_fkey"
            columns: ["formulario_id"]
            isOneToOne: false
            referencedRelation: "formularios"
            referencedColumns: ["id"]
          },
        ]
      }
      formularios: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          estilo: string
          id: string
          servico_id: string | null
          titulo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          estilo?: string
          id?: string
          servico_id?: string | null
          titulo: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          estilo?: string
          id?: string
          servico_id?: string | null
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "formularios_servico_id_fkey"
            columns: ["servico_id"]
            isOneToOne: false
            referencedRelation: "servicos"
            referencedColumns: ["id"]
          },
        ]
      }
      integracoes: {
        Row: {
          api_key: string | null
          ativo: boolean
          config: Json | null
          created_at: string
          id: string
          nome: string
          tipo: string
          updated_at: string
          url: string | null
        }
        Insert: {
          api_key?: string | null
          ativo?: boolean
          config?: Json | null
          created_at?: string
          id?: string
          nome: string
          tipo: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          api_key?: string | null
          ativo?: boolean
          config?: Json | null
          created_at?: string
          id?: string
          nome?: string
          tipo?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: []
      }
      integration_history: {
        Row: {
          created_at: string | null
          detalhes: string | null
          id: string
          integracao_nome: string
          payload: Json | null
          response: Json | null
          solicitacao_id: string | null
          status: string
          tipo: string
        }
        Insert: {
          created_at?: string | null
          detalhes?: string | null
          id?: string
          integracao_nome: string
          payload?: Json | null
          response?: Json | null
          solicitacao_id?: string | null
          status: string
          tipo: string
        }
        Update: {
          created_at?: string | null
          detalhes?: string | null
          id?: string
          integracao_nome?: string
          payload?: Json | null
          response?: Json | null
          solicitacao_id?: string | null
          status?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_history_solicitacao_id_fkey"
            columns: ["solicitacao_id"]
            isOneToOne: false
            referencedRelation: "solicitacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_history_solicitacao_id_fkey"
            columns: ["solicitacao_id"]
            isOneToOne: false
            referencedRelation: "solicitacoes_v"
            referencedColumns: ["id"]
          },
        ]
      }
      lacre_armador_dados: {
        Row: {
          confirmado_data: string | null
          confirmado_por: string | null
          created_at: string
          data_posicionamento_lacre: string | null
          foto_lacre_path: string | null
          foto_lacre_url: string | null
          id: string
          lacre_coletado: boolean | null
          lacre_status: string
          motivo_recusa: string | null
          periodo_lacre: string | null
          responsavel_email: string | null
          responsavel_nome: string | null
          responsavel_telefone: string | null
          solicitacao_id: string
          updated_at: string
        }
        Insert: {
          confirmado_data?: string | null
          confirmado_por?: string | null
          created_at?: string
          data_posicionamento_lacre?: string | null
          foto_lacre_path?: string | null
          foto_lacre_url?: string | null
          id?: string
          lacre_coletado?: boolean | null
          lacre_status?: string
          motivo_recusa?: string | null
          periodo_lacre?: string | null
          responsavel_email?: string | null
          responsavel_nome?: string | null
          responsavel_telefone?: string | null
          solicitacao_id: string
          updated_at?: string
        }
        Update: {
          confirmado_data?: string | null
          confirmado_por?: string | null
          created_at?: string
          data_posicionamento_lacre?: string | null
          foto_lacre_path?: string | null
          foto_lacre_url?: string | null
          id?: string
          lacre_coletado?: boolean | null
          lacre_status?: string
          motivo_recusa?: string | null
          periodo_lacre?: string | null
          responsavel_email?: string | null
          responsavel_nome?: string | null
          responsavel_telefone?: string | null
          solicitacao_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lacre_armador_dados_solicitacao_id_fkey"
            columns: ["solicitacao_id"]
            isOneToOne: false
            referencedRelation: "solicitacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lacre_armador_dados_solicitacao_id_fkey"
            columns: ["solicitacao_id"]
            isOneToOne: false
            referencedRelation: "solicitacoes_v"
            referencedColumns: ["id"]
          },
        ]
      }
      lancamento_cobranca_config: {
        Row: {
          ativo: boolean
          campo_referencia: string | null
          created_at: string
          id: string
          nome: string
          rotulo_analise: string
          servico_ids: string[]
          status_ativacao: string[]
          tipo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          campo_referencia?: string | null
          created_at?: string
          id?: string
          nome: string
          rotulo_analise: string
          servico_ids?: string[]
          status_ativacao?: string[]
          tipo?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          campo_referencia?: string | null
          created_at?: string
          id?: string
          nome?: string
          rotulo_analise?: string
          servico_ids?: string[]
          status_ativacao?: string[]
          tipo?: string
          updated_at?: string
        }
        Relationships: []
      }
      lancamento_cobranca_registros: {
        Row: {
          cobranca_config_id: string
          confirmado: boolean
          confirmado_data: string | null
          confirmado_por: string | null
          created_at: string
          id: string
          solicitacao_id: string
          updated_at: string
        }
        Insert: {
          cobranca_config_id: string
          confirmado?: boolean
          confirmado_data?: string | null
          confirmado_por?: string | null
          created_at?: string
          id?: string
          solicitacao_id: string
          updated_at?: string
        }
        Update: {
          cobranca_config_id?: string
          confirmado?: boolean
          confirmado_data?: string | null
          confirmado_por?: string | null
          created_at?: string
          id?: string
          solicitacao_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lancamento_cobranca_registros_cobranca_config_id_fkey"
            columns: ["cobranca_config_id"]
            isOneToOne: false
            referencedRelation: "lancamento_cobranca_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lancamento_cobranca_registros_solicitacao_id_fkey"
            columns: ["solicitacao_id"]
            isOneToOne: false
            referencedRelation: "solicitacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lancamento_cobranca_registros_solicitacao_id_fkey"
            columns: ["solicitacao_id"]
            isOneToOne: false
            referencedRelation: "solicitacoes_v"
            referencedColumns: ["id"]
          },
        ]
      }
      modelo_relatorio_colunas: {
        Row: {
          campo_sistema: string | null
          coluna_modelo: string
          created_at: string
          id: string
          modelo_id: string
          ordem: number
        }
        Insert: {
          campo_sistema?: string | null
          coluna_modelo: string
          created_at?: string
          id?: string
          modelo_id: string
          ordem?: number
        }
        Update: {
          campo_sistema?: string | null
          coluna_modelo?: string
          created_at?: string
          id?: string
          modelo_id?: string
          ordem?: number
        }
        Relationships: [
          {
            foreignKeyName: "modelo_relatorio_colunas_modelo_id_fkey"
            columns: ["modelo_id"]
            isOneToOne: false
            referencedRelation: "modelos_relatorio"
            referencedColumns: ["id"]
          },
        ]
      }
      modelos_relatorio: {
        Row: {
          ativo: boolean
          created_at: string
          criado_por: string | null
          descricao: string | null
          file_name: string
          file_path: string
          file_size: number | null
          file_url: string | null
          id: string
          nome: string
          tipo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          criado_por?: string | null
          descricao?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          file_url?: string | null
          id?: string
          nome: string
          tipo?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          criado_por?: string | null
          descricao?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_url?: string | null
          id?: string
          nome?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: []
      }
      notification_rules: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          servico_id: string
          setor_ids: string[] | null
          status_gatilho: string
          tipos_notificacao: string[]
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          servico_id: string
          setor_ids?: string[] | null
          status_gatilho: string
          tipos_notificacao?: string[]
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          servico_id?: string
          setor_ids?: string[] | null
          status_gatilho?: string
          tipos_notificacao?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_rules_servico_id_fkey"
            columns: ["servico_id"]
            isOneToOne: false
            referencedRelation: "servicos"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          lida: boolean
          mensagem: string
          solicitacao_id: string | null
          tipo: string
          usuario_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          lida?: boolean
          mensagem: string
          solicitacao_id?: string | null
          tipo: string
          usuario_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          lida?: boolean
          mensagem?: string
          solicitacao_id?: string | null
          tipo?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_solicitacao_id_fkey"
            columns: ["solicitacao_id"]
            isOneToOne: false
            referencedRelation: "solicitacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_solicitacao_id_fkey"
            columns: ["solicitacao_id"]
            isOneToOne: false
            referencedRelation: "solicitacoes_v"
            referencedColumns: ["id"]
          },
        ]
      }
      observacao_historico: {
        Row: {
          autor_id: string
          autor_nome: string | null
          created_at: string
          id: string
          observacao: string
          solicitacao_id: string
          status_no_momento: string
          tipo_observacao: string
        }
        Insert: {
          autor_id: string
          autor_nome?: string | null
          created_at?: string
          id?: string
          observacao: string
          solicitacao_id: string
          status_no_momento: string
          tipo_observacao?: string
        }
        Update: {
          autor_id?: string
          autor_nome?: string | null
          created_at?: string
          id?: string
          observacao?: string
          solicitacao_id?: string
          status_no_momento?: string
          tipo_observacao?: string
        }
        Relationships: [
          {
            foreignKeyName: "observacao_historico_solicitacao_id_fkey"
            columns: ["solicitacao_id"]
            isOneToOne: false
            referencedRelation: "solicitacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "observacao_historico_solicitacao_id_fkey"
            columns: ["solicitacao_id"]
            isOneToOne: false
            referencedRelation: "solicitacoes_v"
            referencedColumns: ["id"]
          },
        ]
      }
      page_config: {
        Row: {
          config_key: string
          config_type: string | null
          config_value: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          updated_at: string | null
        }
        Insert: {
          config_key: string
          config_type?: string | null
          config_value?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
        }
        Update: {
          config_key?: string
          config_type?: string | null
          config_value?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      parametros_campos: {
        Row: {
          ativo: boolean
          created_at: string
          grupo: string
          grupo_status: string
          id: string
          ordem: number
          servico_ids: string[]
          sigla: string | null
          tipo_resultado: string | null
          updated_at: string
          valor: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          grupo: string
          grupo_status?: string
          id?: string
          ordem?: number
          servico_ids?: string[]
          sigla?: string | null
          tipo_resultado?: string | null
          updated_at?: string
          valor: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          grupo?: string
          grupo_status?: string
          id?: string
          ordem?: number
          servico_ids?: string[]
          sigla?: string | null
          tipo_resultado?: string | null
          updated_at?: string
          valor?: string
        }
        Relationships: []
      }
      pendencia_opcoes: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          ordem: number
          updated_at: string
          valor: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          ordem?: number
          updated_at?: string
          valor: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          ordem?: number
          updated_at?: string
          valor?: string
        }
        Relationships: []
      }
      pergunta_condicionais: {
        Row: {
          created_at: string
          formulario_id: string
          id: string
          operador: string
          pergunta_id: string
          pergunta_pai_id: string
          valor_gatilho: string
        }
        Insert: {
          created_at?: string
          formulario_id: string
          id?: string
          operador?: string
          pergunta_id: string
          pergunta_pai_id: string
          valor_gatilho: string
        }
        Update: {
          created_at?: string
          formulario_id?: string
          id?: string
          operador?: string
          pergunta_id?: string
          pergunta_pai_id?: string
          valor_gatilho?: string
        }
        Relationships: [
          {
            foreignKeyName: "pergunta_condicionais_formulario_id_fkey"
            columns: ["formulario_id"]
            isOneToOne: false
            referencedRelation: "formularios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pergunta_condicionais_pergunta_id_fkey"
            columns: ["pergunta_id"]
            isOneToOne: false
            referencedRelation: "banco_perguntas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pergunta_condicionais_pergunta_pai_id_fkey"
            columns: ["pergunta_pai_id"]
            isOneToOne: false
            referencedRelation: "banco_perguntas"
            referencedColumns: ["id"]
          },
        ]
      }
      pergunta_mapeamento: {
        Row: {
          campo_analise_id: string | null
          campo_solicitacao: string
          created_at: string
          formulario_id: string
          id: string
          pergunta_id: string
        }
        Insert: {
          campo_analise_id?: string | null
          campo_solicitacao: string
          created_at?: string
          formulario_id: string
          id?: string
          pergunta_id: string
        }
        Update: {
          campo_analise_id?: string | null
          campo_solicitacao?: string
          created_at?: string
          formulario_id?: string
          id?: string
          pergunta_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pergunta_mapeamento_campo_analise_id_fkey"
            columns: ["campo_analise_id"]
            isOneToOne: false
            referencedRelation: "campos_analise"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pergunta_mapeamento_formulario_id_fkey"
            columns: ["formulario_id"]
            isOneToOne: false
            referencedRelation: "formularios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pergunta_mapeamento_pergunta_id_fkey"
            columns: ["pergunta_id"]
            isOneToOne: false
            referencedRelation: "banco_perguntas"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          bloqueado: boolean
          created_at: string
          email: string
          email_setor: string | null
          id: string
          nome: string | null
          setor: Database["public"]["Enums"]["setor_tipo"] | null
          updated_at: string
        }
        Insert: {
          bloqueado?: boolean
          created_at?: string
          email: string
          email_setor?: string | null
          id: string
          nome?: string | null
          setor?: Database["public"]["Enums"]["setor_tipo"] | null
          updated_at?: string
        }
        Update: {
          bloqueado?: boolean
          created_at?: string
          email?: string
          email_setor?: string | null
          id?: string
          nome?: string | null
          setor?: Database["public"]["Enums"]["setor_tipo"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_email_setor_fkey"
            columns: ["email_setor"]
            isOneToOne: false
            referencedRelation: "setor_emails"
            referencedColumns: ["email_setor"]
          },
        ]
      }
      protocol_config: {
        Row: {
          ano_referencia: number | null
          created_at: string
          id: string
          prefixo: string
          servico_id: string | null
          ultimo_numero: number
          updated_at: string
        }
        Insert: {
          ano_referencia?: number | null
          created_at?: string
          id?: string
          prefixo?: string
          servico_id?: string | null
          ultimo_numero?: number
          updated_at?: string
        }
        Update: {
          ano_referencia?: number | null
          created_at?: string
          id?: string
          prefixo?: string
          servico_id?: string | null
          ultimo_numero?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "protocol_config_servico_id_fkey"
            columns: ["servico_id"]
            isOneToOne: false
            referencedRelation: "servicos"
            referencedColumns: ["id"]
          },
        ]
      }
      regras_servico: {
        Row: {
          agendar_proximo_dia: boolean
          aplica_dia_anterior: boolean
          ativo: boolean
          created_at: string
          dias_semana: string[]
          hora_corte: string
          horarios_por_dia: Json | null
          id: string
          limite_dia: number | null
          limite_qua: number | null
          limite_qui: number | null
          limite_sab: number | null
          limite_seg: number | null
          limite_sex: number | null
          limite_ter: number | null
          recusar_apos_corte: boolean
          servico_id: string
          updated_at: string
          usar_horario_por_dia: boolean
        }
        Insert: {
          agendar_proximo_dia?: boolean
          aplica_dia_anterior?: boolean
          ativo?: boolean
          created_at?: string
          dias_semana?: string[]
          hora_corte?: string
          horarios_por_dia?: Json | null
          id?: string
          limite_dia?: number | null
          limite_qua?: number | null
          limite_qui?: number | null
          limite_sab?: number | null
          limite_seg?: number | null
          limite_sex?: number | null
          limite_ter?: number | null
          recusar_apos_corte?: boolean
          servico_id: string
          updated_at?: string
          usar_horario_por_dia?: boolean
        }
        Update: {
          agendar_proximo_dia?: boolean
          aplica_dia_anterior?: boolean
          ativo?: boolean
          created_at?: string
          dias_semana?: string[]
          hora_corte?: string
          horarios_por_dia?: Json | null
          id?: string
          limite_dia?: number | null
          limite_qua?: number | null
          limite_qui?: number | null
          limite_sab?: number | null
          limite_seg?: number | null
          limite_sex?: number | null
          limite_ter?: number | null
          recusar_apos_corte?: boolean
          servico_id?: string
          updated_at?: string
          usar_horario_por_dia?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "regras_servico_servico_id_fkey"
            columns: ["servico_id"]
            isOneToOne: true
            referencedRelation: "servicos"
            referencedColumns: ["id"]
          },
        ]
      }
      service_routing_rules: {
        Row: {
          ativo: boolean | null
          campo_criterio: string
          created_at: string | null
          id: string
          servico_id: string | null
          setor_ids: string[]
          updated_at: string | null
          valor_criterio: string
        }
        Insert: {
          ativo?: boolean | null
          campo_criterio: string
          created_at?: string | null
          id?: string
          servico_id?: string | null
          setor_ids?: string[]
          updated_at?: string | null
          valor_criterio: string
        }
        Update: {
          ativo?: boolean | null
          campo_criterio?: string
          created_at?: string | null
          id?: string
          servico_id?: string | null
          setor_ids?: string[]
          updated_at?: string | null
          valor_criterio?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_routing_rules_servico_id_fkey"
            columns: ["servico_id"]
            isOneToOne: false
            referencedRelation: "servicos"
            referencedColumns: ["id"]
          },
        ]
      }
      servicos: {
        Row: {
          anexos_embutidos: boolean | null
          aprovacao_administrativo: boolean | null
          aprovacao_ativada: boolean | null
          aprovacao_operacional: boolean | null
          ativo: boolean
          codigo_prefixo: string
          created_at: string
          deferimento_embutidos: boolean
          deferimento_pendencias_ativacao: string[] | null
          deferimento_status_ativacao: string[] | null
          descricao: string | null
          id: string
          lacre_armador_pendencias_ativacao: string[] | null
          lacre_armador_status_ativacao: string[] | null
          nome: string
          status_confirmacao_lancamento: string[] | null
          tipo_agendamento: string | null
          updated_at: string
        }
        Insert: {
          anexos_embutidos?: boolean | null
          aprovacao_administrativo?: boolean | null
          aprovacao_ativada?: boolean | null
          aprovacao_operacional?: boolean | null
          ativo?: boolean
          codigo_prefixo: string
          created_at?: string
          deferimento_embutidos?: boolean
          deferimento_pendencias_ativacao?: string[] | null
          deferimento_status_ativacao?: string[] | null
          descricao?: string | null
          id?: string
          lacre_armador_pendencias_ativacao?: string[] | null
          lacre_armador_status_ativacao?: string[] | null
          nome: string
          status_confirmacao_lancamento?: string[] | null
          tipo_agendamento?: string | null
          updated_at?: string
        }
        Update: {
          anexos_embutidos?: boolean | null
          aprovacao_administrativo?: boolean | null
          aprovacao_ativada?: boolean | null
          aprovacao_operacional?: boolean | null
          ativo?: boolean
          codigo_prefixo?: string
          created_at?: string
          deferimento_embutidos?: boolean
          deferimento_pendencias_ativacao?: string[] | null
          deferimento_status_ativacao?: string[] | null
          descricao?: string | null
          id?: string
          lacre_armador_pendencias_ativacao?: string[] | null
          lacre_armador_status_ativacao?: string[] | null
          nome?: string
          status_confirmacao_lancamento?: string[] | null
          tipo_agendamento?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      setor_emails: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          email_setor: string
          id: string
          perfis: string[] | null
          setor: Database["public"]["Enums"]["setor_tipo"]
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          email_setor: string
          id?: string
          perfis?: string[] | null
          setor: Database["public"]["Enums"]["setor_tipo"]
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          email_setor?: string
          id?: string
          perfis?: string[] | null
          setor?: Database["public"]["Enums"]["setor_tipo"]
        }
        Relationships: []
      }
      setor_servicos: {
        Row: {
          created_at: string
          id: string
          servico_id: string
          setor_email_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          servico_id: string
          setor_email_id: string
        }
        Update: {
          created_at?: string
          id?: string
          servico_id?: string
          setor_email_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "setor_servicos_servico_id_fkey"
            columns: ["servico_id"]
            isOneToOne: false
            referencedRelation: "servicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "setor_servicos_setor_email_id_fkey"
            columns: ["setor_email_id"]
            isOneToOne: false
            referencedRelation: "setor_emails"
            referencedColumns: ["id"]
          },
        ]
      }
      solicitacoes: {
        Row: {
          armazem_aprovado: boolean | null
          armazem_data: string | null
          armazem_justificativa: string | null
          armazem_usuario_id: string | null
          cancelamento_solicitado: boolean | null
          cancelamento_solicitado_em: string | null
          categoria: string | null
          chave_consulta: string
          cliente_email: string
          cliente_email_hash: string | null
          cliente_nome: string
          cliente_nome_hash: string | null
          cnpj: string | null
          cnpj_hash: string | null
          comex_aprovado: boolean | null
          comex_data: string | null
          comex_justificativa: string | null
          comex_usuario_id: string | null
          created_at: string
          custo_posicionamento: boolean | null
          data_agendamento: string | null
          data_posicionamento: string | null
          formulario_id: string | null
          id: string
          lacre_armador_aceite_custo: boolean | null
          lacre_armador_possui: boolean | null
          lancamento_confirmado: boolean | null
          lancamento_confirmado_data: string | null
          lancamento_confirmado_por: string | null
          lpco: string | null
          numero_conteiner: string | null
          observacoes: string | null
          pendencias_selecionadas: string[] | null
          protocolo: string
          solicitar_deferimento: boolean | null
          solicitar_lacre_armador: boolean | null
          status: Database["public"]["Enums"]["status_solicitacao"]
          status_vistoria: string | null
          tipo_carga: string | null
          tipo_operacao: string | null
          updated_at: string
        }
        Insert: {
          armazem_aprovado?: boolean | null
          armazem_data?: string | null
          armazem_justificativa?: string | null
          armazem_usuario_id?: string | null
          cancelamento_solicitado?: boolean | null
          cancelamento_solicitado_em?: string | null
          categoria?: string | null
          chave_consulta?: string
          cliente_email: string
          cliente_email_hash?: string | null
          cliente_nome: string
          cliente_nome_hash?: string | null
          cnpj?: string | null
          cnpj_hash?: string | null
          comex_aprovado?: boolean | null
          comex_data?: string | null
          comex_justificativa?: string | null
          comex_usuario_id?: string | null
          created_at?: string
          custo_posicionamento?: boolean | null
          data_agendamento?: string | null
          data_posicionamento?: string | null
          formulario_id?: string | null
          id?: string
          lacre_armador_aceite_custo?: boolean | null
          lacre_armador_possui?: boolean | null
          lancamento_confirmado?: boolean | null
          lancamento_confirmado_data?: string | null
          lancamento_confirmado_por?: string | null
          lpco?: string | null
          numero_conteiner?: string | null
          observacoes?: string | null
          pendencias_selecionadas?: string[] | null
          protocolo: string
          solicitar_deferimento?: boolean | null
          solicitar_lacre_armador?: boolean | null
          status?: Database["public"]["Enums"]["status_solicitacao"]
          status_vistoria?: string | null
          tipo_carga?: string | null
          tipo_operacao?: string | null
          updated_at?: string
        }
        Update: {
          armazem_aprovado?: boolean | null
          armazem_data?: string | null
          armazem_justificativa?: string | null
          armazem_usuario_id?: string | null
          cancelamento_solicitado?: boolean | null
          cancelamento_solicitado_em?: string | null
          categoria?: string | null
          chave_consulta?: string
          cliente_email?: string
          cliente_email_hash?: string | null
          cliente_nome?: string
          cliente_nome_hash?: string | null
          cnpj?: string | null
          cnpj_hash?: string | null
          comex_aprovado?: boolean | null
          comex_data?: string | null
          comex_justificativa?: string | null
          comex_usuario_id?: string | null
          created_at?: string
          custo_posicionamento?: boolean | null
          data_agendamento?: string | null
          data_posicionamento?: string | null
          formulario_id?: string | null
          id?: string
          lacre_armador_aceite_custo?: boolean | null
          lacre_armador_possui?: boolean | null
          lancamento_confirmado?: boolean | null
          lancamento_confirmado_data?: string | null
          lancamento_confirmado_por?: string | null
          lpco?: string | null
          numero_conteiner?: string | null
          observacoes?: string | null
          pendencias_selecionadas?: string[] | null
          protocolo?: string
          solicitar_deferimento?: boolean | null
          solicitar_lacre_armador?: boolean | null
          status?: Database["public"]["Enums"]["status_solicitacao"]
          status_vistoria?: string | null
          tipo_carga?: string | null
          tipo_operacao?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "solicitacoes_formulario_id_fkey"
            columns: ["formulario_id"]
            isOneToOne: false
            referencedRelation: "formularios"
            referencedColumns: ["id"]
          },
        ]
      }
      system_config: {
        Row: {
          config_key: string
          config_type: string
          config_value: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          updated_at: string
        }
        Insert: {
          config_key: string
          config_type?: string
          config_value?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          config_key?: string
          config_type?: string
          config_value?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      tipos_setor: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          id: string
          nome: string
          pode_aprovar: boolean
          pode_editar_processo: boolean
          pode_recusar: boolean
          pode_visualizar_todos: boolean
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          pode_aprovar?: boolean
          pode_editar_processo?: boolean
          pode_recusar?: boolean
          pode_visualizar_todos?: boolean
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          pode_aprovar?: boolean
          pode_editar_processo?: boolean
          pode_recusar?: boolean
          pode_visualizar_todos?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      admin_accounts_v: {
        Row: {
          ativo: boolean | null
          cpf: string | null
          cpf_hash: string | null
          created_at: string | null
          id: string | null
          nome: string | null
          senha_hash: string | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          cpf?: never
          cpf_hash?: string | null
          created_at?: string | null
          id?: string | null
          nome?: never
          senha_hash?: string | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          cpf?: never
          cpf_hash?: string | null
          created_at?: string | null
          id?: string | null
          nome?: never
          senha_hash?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles_v: {
        Row: {
          bloqueado: boolean | null
          created_at: string | null
          email: string | null
          email_setor: string | null
          id: string | null
          nome: string | null
          setor: Database["public"]["Enums"]["setor_tipo"] | null
          updated_at: string | null
        }
        Insert: {
          bloqueado?: boolean | null
          created_at?: string | null
          email?: string | null
          email_setor?: string | null
          id?: string | null
          nome?: never
          setor?: Database["public"]["Enums"]["setor_tipo"] | null
          updated_at?: string | null
        }
        Update: {
          bloqueado?: boolean | null
          created_at?: string | null
          email?: string | null
          email_setor?: string | null
          id?: string | null
          nome?: never
          setor?: Database["public"]["Enums"]["setor_tipo"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_email_setor_fkey"
            columns: ["email_setor"]
            isOneToOne: false
            referencedRelation: "setor_emails"
            referencedColumns: ["email_setor"]
          },
        ]
      }
      solicitacoes_v: {
        Row: {
          armazem_aprovado: boolean | null
          armazem_data: string | null
          armazem_justificativa: string | null
          armazem_usuario_id: string | null
          cancelamento_solicitado: boolean | null
          cancelamento_solicitado_em: string | null
          categoria: string | null
          chave_consulta: string | null
          cliente_email: string | null
          cliente_email_hash: string | null
          cliente_nome: string | null
          cliente_nome_hash: string | null
          cnpj: string | null
          cnpj_hash: string | null
          comex_aprovado: boolean | null
          comex_data: string | null
          comex_justificativa: string | null
          comex_usuario_id: string | null
          created_at: string | null
          custo_posicionamento: boolean | null
          data_agendamento: string | null
          data_posicionamento: string | null
          id: string | null
          lacre_armador_aceite_custo: boolean | null
          lacre_armador_possui: boolean | null
          lancamento_confirmado: boolean | null
          lancamento_confirmado_data: string | null
          lancamento_confirmado_por: string | null
          lpco: string | null
          numero_conteiner: string | null
          observacoes: string | null
          pendencias_selecionadas: string[] | null
          protocolo: string | null
          solicitar_deferimento: boolean | null
          solicitar_lacre_armador: boolean | null
          status: Database["public"]["Enums"]["status_solicitacao"] | null
          status_vistoria: string | null
          tipo_carga: string | null
          tipo_operacao: string | null
          updated_at: string | null
        }
        Insert: {
          armazem_aprovado?: boolean | null
          armazem_data?: string | null
          armazem_justificativa?: string | null
          armazem_usuario_id?: string | null
          cancelamento_solicitado?: boolean | null
          cancelamento_solicitado_em?: string | null
          categoria?: string | null
          chave_consulta?: string | null
          cliente_email?: never
          cliente_email_hash?: string | null
          cliente_nome?: never
          cliente_nome_hash?: string | null
          cnpj?: never
          cnpj_hash?: string | null
          comex_aprovado?: boolean | null
          comex_data?: string | null
          comex_justificativa?: string | null
          comex_usuario_id?: string | null
          created_at?: string | null
          custo_posicionamento?: boolean | null
          data_agendamento?: string | null
          data_posicionamento?: string | null
          id?: string | null
          lacre_armador_aceite_custo?: boolean | null
          lacre_armador_possui?: boolean | null
          lancamento_confirmado?: boolean | null
          lancamento_confirmado_data?: string | null
          lancamento_confirmado_por?: string | null
          lpco?: string | null
          numero_conteiner?: string | null
          observacoes?: string | null
          pendencias_selecionadas?: string[] | null
          protocolo?: string | null
          solicitar_deferimento?: boolean | null
          solicitar_lacre_armador?: boolean | null
          status?: Database["public"]["Enums"]["status_solicitacao"] | null
          status_vistoria?: string | null
          tipo_carga?: string | null
          tipo_operacao?: string | null
          updated_at?: string | null
        }
        Update: {
          armazem_aprovado?: boolean | null
          armazem_data?: string | null
          armazem_justificativa?: string | null
          armazem_usuario_id?: string | null
          cancelamento_solicitado?: boolean | null
          cancelamento_solicitado_em?: string | null
          categoria?: string | null
          chave_consulta?: string | null
          cliente_email?: never
          cliente_email_hash?: string | null
          cliente_nome?: never
          cliente_nome_hash?: string | null
          cnpj?: never
          cnpj_hash?: string | null
          comex_aprovado?: boolean | null
          comex_data?: string | null
          comex_justificativa?: string | null
          comex_usuario_id?: string | null
          created_at?: string | null
          custo_posicionamento?: boolean | null
          data_agendamento?: string | null
          data_posicionamento?: string | null
          id?: string | null
          lacre_armador_aceite_custo?: boolean | null
          lacre_armador_possui?: boolean | null
          lancamento_confirmado?: boolean | null
          lancamento_confirmado_data?: string | null
          lancamento_confirmado_por?: string | null
          lpco?: string | null
          numero_conteiner?: string | null
          observacoes?: string | null
          pendencias_selecionadas?: string[] | null
          protocolo?: string | null
          solicitar_deferimento?: boolean | null
          solicitar_lacre_armador?: boolean | null
          status?: Database["public"]["Enums"]["status_solicitacao"] | null
          status_vistoria?: string | null
          tipo_carga?: string | null
          tipo_operacao?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      _get_enc_key: { Args: never; Returns: string }
      create_notifications_for_others: {
        Args: {
          p_exclude_user_id: string
          p_mensagem: string
          p_solicitacao_id: string
          p_tipo: string
        }
        Returns: undefined
      }
      decrypt_pii: { Args: { encrypted_text: string }; Returns: string }
      encrypt_pii: { Args: { plain_text: string }; Returns: string }
      get_user_email_setor: { Args: { _user_id: string }; Returns: string }
      get_user_sector: {
        Args: { user_id: string }
        Returns: Database["public"]["Enums"]["setor_tipo"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      hash_pii: { Args: { plain_text: string }; Returns: string }
      insert_audit_log: {
        Args: {
          p_acao: string
          p_detalhes?: string
          p_entidade?: string
          p_entidade_id?: string
          p_solicitacao_id: string
          p_usuario_id: string
        }
        Returns: undefined
      }
      is_gestor: { Args: { _user_id: string }; Returns: boolean }
      is_gestor_for_service: {
        Args: { _servico_id: string; _user_id: string }
        Returns: boolean
      }
      setup_admin_role: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "user" | "gestor"
      setor_tipo:
        | "COMEX"
        | "ARMAZEM"
        | "ADMINISTRATIVO"
        | "OPERACIONAL"
        | "MASTER"
      status_solicitacao:
        | "aguardando_confirmacao"
        | "cancelado"
        | "recusado"
        | "confirmado_aguardando_vistoria"
        | "vistoria_finalizada"
        | "vistoriado_com_pendencia"
        | "nao_vistoriado"
        | "confirmado_aguardando_servico"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user", "gestor"],
      setor_tipo: [
        "COMEX",
        "ARMAZEM",
        "ADMINISTRATIVO",
        "OPERACIONAL",
        "MASTER",
      ],
      status_solicitacao: [
        "aguardando_confirmacao",
        "cancelado",
        "recusado",
        "confirmado_aguardando_vistoria",
        "vistoria_finalizada",
        "vistoriado_com_pendencia",
        "nao_vistoriado",
        "confirmado_aguardando_servico",
      ],
    },
  },
} as const
