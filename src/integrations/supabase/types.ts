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
        ]
      }
      deferimento_documents: {
        Row: {
          created_at: string
          file_name: string
          file_url: string
          id: string
          solicitacao_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_url: string
          id?: string
          solicitacao_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_url?: string
          id?: string
          solicitacao_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deferimento_documents_solicitacao_id_fkey"
            columns: ["solicitacao_id"]
            isOneToOne: false
            referencedRelation: "solicitacoes"
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
          id: string
          integracao_id: string | null
          sistema: string | null
        }
        Insert: {
          campo_externo: string
          campo_interno: string
          created_at?: string
          descricao?: string | null
          id?: string
          integracao_id?: string | null
          sistema?: string | null
        }
        Update: {
          campo_externo?: string
          campo_interno?: string
          created_at?: string
          descricao?: string | null
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
          created_at: string
          id: string
          prefixo: string
          ultimo_numero: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          prefixo?: string
          ultimo_numero?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          prefixo?: string
          ultimo_numero?: number
          updated_at?: string
        }
        Relationships: []
      }
      regras_servico: {
        Row: {
          aplica_dia_anterior: boolean
          ativo: boolean
          created_at: string
          dias_semana: string[]
          hora_corte: string
          id: string
          limite_dia: number | null
          limite_qua: number | null
          limite_qui: number | null
          limite_sab: number | null
          limite_seg: number | null
          limite_sex: number | null
          limite_ter: number | null
          servico_id: string
          updated_at: string
        }
        Insert: {
          aplica_dia_anterior?: boolean
          ativo?: boolean
          created_at?: string
          dias_semana?: string[]
          hora_corte?: string
          id?: string
          limite_dia?: number | null
          limite_qua?: number | null
          limite_qui?: number | null
          limite_sab?: number | null
          limite_seg?: number | null
          limite_sex?: number | null
          limite_ter?: number | null
          servico_id: string
          updated_at?: string
        }
        Update: {
          aplica_dia_anterior?: boolean
          ativo?: boolean
          created_at?: string
          dias_semana?: string[]
          hora_corte?: string
          id?: string
          limite_dia?: number | null
          limite_qua?: number | null
          limite_qui?: number | null
          limite_sab?: number | null
          limite_seg?: number | null
          limite_sex?: number | null
          limite_ter?: number | null
          servico_id?: string
          updated_at?: string
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
      servicos: {
        Row: {
          ativo: boolean
          codigo_prefixo: string
          created_at: string
          descricao: string | null
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          codigo_prefixo: string
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          codigo_prefixo?: string
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
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
          setor: Database["public"]["Enums"]["setor_tipo"]
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          email_setor: string
          id?: string
          setor: Database["public"]["Enums"]["setor_tipo"]
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          email_setor?: string
          id?: string
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
          cliente_email: string
          cliente_nome: string
          comex_aprovado: boolean | null
          comex_data: string | null
          comex_justificativa: string | null
          comex_usuario_id: string | null
          created_at: string
          data_posicionamento: string | null
          id: string
          lpco: string | null
          numero_conteiner: string | null
          observacoes: string | null
          protocolo: string
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
          cliente_email: string
          cliente_nome: string
          comex_aprovado?: boolean | null
          comex_data?: string | null
          comex_justificativa?: string | null
          comex_usuario_id?: string | null
          created_at?: string
          data_posicionamento?: string | null
          id?: string
          lpco?: string | null
          numero_conteiner?: string | null
          observacoes?: string | null
          protocolo: string
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
          cliente_email?: string
          cliente_nome?: string
          comex_aprovado?: boolean | null
          comex_data?: string | null
          comex_justificativa?: string | null
          comex_usuario_id?: string | null
          created_at?: string
          data_posicionamento?: string | null
          id?: string
          lpco?: string | null
          numero_conteiner?: string | null
          observacoes?: string | null
          protocolo?: string
          status?: Database["public"]["Enums"]["status_solicitacao"]
          status_vistoria?: string | null
          tipo_carga?: string | null
          tipo_operacao?: string | null
          updated_at?: string
        }
        Relationships: []
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
      [_ in never]: never
    }
    Functions: {
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
      setup_admin_role: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "user"
      setor_tipo: "COMEX" | "ARMAZEM"
      status_solicitacao:
        | "aguardando_confirmacao"
        | "cancelado"
        | "recusado"
        | "confirmado_aguardando_vistoria"
        | "vistoria_finalizada"
        | "vistoriado_com_pendencia"
        | "nao_vistoriado"
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
      app_role: ["admin", "user"],
      setor_tipo: ["COMEX", "ARMAZEM"],
      status_solicitacao: [
        "aguardando_confirmacao",
        "cancelado",
        "recusado",
        "confirmado_aguardando_vistoria",
        "vistoria_finalizada",
        "vistoriado_com_pendencia",
        "nao_vistoriado",
      ],
    },
  },
} as const
