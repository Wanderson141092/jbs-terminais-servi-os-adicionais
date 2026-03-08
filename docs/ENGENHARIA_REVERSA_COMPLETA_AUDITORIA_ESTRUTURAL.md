# Engenharia Reversa Completa + Auditoria Estrutural

## FASE 1 — Inventário completo do projeto

- Frontend: `src/pages`, `src/components`, `src/hooks`, `src/lib`, `src/integrations/supabase`.
- Backend: `supabase/functions/*` (Edge Functions Deno).
- Banco: PostgreSQL via Supabase; migrations em `supabase/migrations/*`.

## FASE 2 — Banco de dados

- Tabelas: 44 | Views: admin_accounts_v, profiles_v, solicitacoes_v | Funções SQL: _get_enc_key, create_notifications_for_others, decrypt_pii, encrypt_pii, get_user_email_setor, get_user_sector, has_role, hash_pii, insert_audit_log, is_gestor, is_gestor_for_service, setup_admin_role

### `_encryption_keys`
- Colunas: `id:number`, `key_value:string`
- PK: `id` (inferido)
- FKs: nenhuma
- Índices: n/d
- Constraints: n/d
- Triggers: n/d

### `admin_accounts`
- Colunas: `ativo:boolean | null`, `cpf:string`, `cpf_hash:string | null`, `created_at:string | null`, `id:string`, `nome:string`, `senha_hash:string`, `updated_at:string | null`
- PK: `id` (inferido)
- FKs: nenhuma
- Índices: n/d
- Constraints: nome_length: CHECK (length(nome) <= 255),
  ADD CONSTRAINT cpf_length CHECK (length(cpf) <= 11) [20260211051659_ea7e272f-5b97-4ab1-a9d0-4e814c063bb0.sql]
- Triggers: aaa_encrypt_admin_accounts: BEFORE INSERT OR UPDATE on FOR EACH ROW EXECUTE FUNCTION public.trigger_encrypt_admin_accounts() [20260301032749_ce3cba1d-b8fa-469c-a1d0-9efebae9e351.sql]

### `audit_log`
- Colunas: `acao:string`, `created_at:string`, `detalhes:string | null`, `entidade:string | null`, `entidade_id:string | null`, `id:string`, `solicitacao_id:string`, `usuario_id:string`
- PK: `id` (inferido)
- FKs: `solicitacao_id` -> `solicitacoes.id`
- Índices: idx_audit_solicitacao (solicitacao_id) [20260208173021_da0b55cd-e5aa-4045-b6db-b7365f7e53cc.sql]
- Constraints: detalhes_length: CHECK (length(detalhes) <= 10000) [20260211051659_ea7e272f-5b97-4ab1-a9d0-4e814c063bb0.sql]
- Triggers: n/d

### `banco_perguntas`
- Colunas: `ativo:boolean`, `config:Json | null`, `created_at:string`, `descricao:string | null`, `id:string`, `opcoes:Json | null`, `placeholder:string | null`, `rotulo:string`, `tipo:string`, `updated_at:string`
- PK: `id` (inferido)
- FKs: nenhuma
- Índices: n/d
- Constraints: n/d
- Triggers: n/d

### `campos_analise`
- Colunas: `ativo:boolean`, `created_at:string`, `id:string`, `nome:string`, `obrigatorio:boolean`, `opcoes:Json | null`, `ordem:number`, `servico_ids:string[]`, `tipo:string`, `updated_at:string`, `visivel_externo:boolean`
- PK: `id` (inferido)
- FKs: nenhuma
- Índices: n/d
- Constraints: n/d
- Triggers: n/d

### `campos_analise_valores`
- Colunas: `campo_id:string`, `created_at:string`, `id:string`, `solicitacao_id:string`, `updated_at:string`, `valor:string | null`
- PK: `id` (inferido)
- FKs: `campo_id` -> `campos_analise.id`; `solicitacao_id` -> `solicitacoes.id`
- Índices: n/d
- Constraints: n/d
- Triggers: n/d

### `campos_fixos_config`
- Colunas: `ativo:boolean`, `campo_chave:string`, `campo_label:string`, `created_at:string`, `id:string`, `obrigatorio_analise:boolean`, `ordem:number`, `servico_ids:string[]`, `updated_at:string`, `visivel_analise:boolean`, `visivel_externo:boolean`
- PK: `id` (inferido)
- FKs: nenhuma
- Índices: n/d
- Constraints: n/d
- Triggers: n/d

### `cancelamento_recusa_config`
- Colunas: `ativo:boolean`, `created_at:string`, `id:string`, `servico_ids:string[]`, `status_habilitados:string[]`, `tipo:string`, `updated_at:string`
- PK: `id` (inferido)
- FKs: nenhuma
- Índices: n/d
- Constraints: n/d
- Triggers: n/d

### `consulta_etapas_config`
- Colunas: `ativo:boolean`, `chave:string`, `created_at:string`, `descricao:string | null`, `etapa_equivalente:string | null`, `grupo:string`, `id:string`, `ordem:number`, `servico_ids:string[]`, `status_gatilho:string[] | null`, `tipo:string`, `titulo:string`, `updated_at:string`
- PK: `id` (inferido)
- FKs: nenhuma
- Índices: n/d
- Constraints: n/d
- Triggers: n/d

### `deferimento_documents`
- Colunas: `created_at:string`, `document_type:string`, `file_name:string`, `file_url:string`, `id:string`, `motivo_recusa:string | null`, `solicitacao_id:string`, `status:string | null`
- PK: `id` (inferido)
- FKs: `solicitacao_id` -> `solicitacoes.id`
- Índices: idx_deferimento_documents_solicitacao_type (solicitacao_id, document_type, created_at DESC) [20260209071746_5d4e0405-d994-40ee-bab7-4b526d862600.sql]
- Constraints: n/d
- Triggers: n/d

### `deferimento_titulos`
- Colunas: `ativo:boolean`, `created_at:string`, `id:string`, `servico_ids:string[]`, `titulo:string`, `updated_at:string`
- PK: `id` (inferido)
- FKs: nenhuma
- Índices: n/d
- Constraints: n/d
- Triggers: n/d

### `estilos_formulario`
- Colunas: `ativo:boolean`, `chave:string`, `config:Json`, `created_at:string`, `descricao:string | null`, `features:string[]`, `id:string`, `nome:string`, `ordem:number`, `updated_at:string`
- PK: `id` (inferido)
- FKs: nenhuma
- Índices: n/d
- Constraints: n/d
- Triggers: n/d

### `external_buttons`
- Colunas: `abrir_nova_aba:boolean | null`, `ativo:boolean`, `created_at:string`, `descricao:string | null`, `formulario_id:string | null`, `icone:string | null`, `id:string`, `ordem:number`, `tipo:string`, `titulo:string`, `updated_at:string`, `url:string | null`
- PK: `id` (inferido)
- FKs: `formulario_id` -> `formularios.id`
- Índices: n/d
- Constraints: external_buttons_formulario_id_fkey: FOREIGN KEY (formulario_id) REFERENCES public.formularios(id) ON DELETE SET NULL [20260209080851_8520b2fd-d3f3-4e0a-8b6f-b0d74a1ffee6.sql]; url_scheme_check: CHECK (url IS NULL OR url ~* '^https?://') [20260211061628_16cd9d0e-d6d6-4b47-b01c-cee3ada0eee1.sql]
- Triggers: n/d

### `field_mappings`
- Colunas: `campo_externo:string`, `campo_interno:string`, `created_at:string`, `descricao:string | null`, `direcao:string`, `id:string`, `integracao_id:string | null`, `sistema:string | null`
- PK: `id` (inferido)
- FKs: `integracao_id` -> `integracoes.id`
- Índices: n/d
- Constraints: n/d
- Triggers: n/d

### `formulario_campos`
- Colunas: `condicao:Json | null`, `created_at:string`, `formulario_id:string`, `id:string`, `obrigatorio:boolean`, `opcoes:Json | null`, `ordem:number`, `placeholder:string | null`, `rotulo:string`, `tipo:string`
- PK: `id` (inferido)
- FKs: `formulario_id` -> `formularios.id`
- Índices: n/d
- Constraints: n/d
- Triggers: n/d

### `formulario_perguntas`
- Colunas: `created_at:string`, `formulario_id:string`, `id:string`, `obrigatorio:boolean`, `ordem:number`, `pergunta_id:string`
- PK: `id` (inferido)
- FKs: `formulario_id` -> `formularios.id`; `pergunta_id` -> `banco_perguntas.id`
- Índices: idx_formulario_perguntas_form (formulario_id) [20260214061750_344d3117-24ee-4aa1-bf9c-b38680e7df3b.sql]; idx_formulario_perguntas_perg (pergunta_id) [20260214061750_344d3117-24ee-4aa1-bf9c-b38680e7df3b.sql]
- Constraints: n/d
- Triggers: n/d

### `formulario_respostas`
- Colunas: `arquivos:Json | null`, `created_at:string`, `formulario_id:string`, `id:string`, `ip_address:string | null`, `respostas:Json`
- PK: `id` (inferido)
- FKs: `formulario_id` -> `formularios.id`
- Índices: n/d
- Constraints: n/d
- Triggers: n/d

### `formularios`
- Colunas: `ativo:boolean`, `created_at:string`, `descricao:string | null`, `estilo:string`, `id:string`, `servico_id:string | null`, `titulo:string`, `updated_at:string`
- PK: `id` (inferido)
- FKs: `servico_id` -> `servicos.id`
- Índices: n/d
- Constraints: n/d
- Triggers: n/d

### `integracoes`
- Colunas: `api_key:string | null`, `ativo:boolean`, `config:Json | null`, `created_at:string`, `id:string`, `nome:string`, `tipo:string`, `updated_at:string`, `url:string | null`
- PK: `id` (inferido)
- FKs: nenhuma
- Índices: n/d
- Constraints: url_scheme_check: CHECK (url IS NULL OR url ~* '^https?://') [20260211061628_16cd9d0e-d6d6-4b47-b01c-cee3ada0eee1.sql]
- Triggers: n/d

### `integration_history`
- Colunas: `created_at:string | null`, `detalhes:string | null`, `id:string`, `integracao_nome:string`, `payload:Json | null`, `response:Json | null`, `solicitacao_id:string | null`, `status:string`, `tipo:string`
- PK: `id` (inferido)
- FKs: `solicitacao_id` -> `solicitacoes.id`
- Índices: n/d
- Constraints: n/d
- Triggers: n/d

### `lacre_armador_dados`
- Colunas: `confirmado_data:string | null`, `confirmado_por:string | null`, `created_at:string`, `data_posicionamento_lacre:string | null`, `foto_lacre_path:string | null`, `foto_lacre_url:string | null`, `id:string`, `lacre_coletado:boolean | null`, `lacre_status:string`, `motivo_recusa:string | null`, `periodo_lacre:string | null`, `responsavel_email:string | null`, `responsavel_nome:string | null`, `responsavel_telefone:string | null`, `solicitacao_id:string`, `updated_at:string`
- PK: `id` (inferido)
- FKs: `solicitacao_id` -> `solicitacoes.id`
- Índices: n/d
- Constraints: n/d
- Triggers: n/d

### `lancamento_cobranca_config`
- Colunas: `ativo:boolean`, `campo_referencia:string | null`, `created_at:string`, `id:string`, `nome:string`, `rotulo_analise:string`, `servico_ids:string[]`, `status_ativacao:string[]`, `tipo:string`, `updated_at:string`
- PK: `id` (inferido)
- FKs: nenhuma
- Índices: n/d
- Constraints: n/d
- Triggers: n/d

### `lancamento_cobranca_registros`
- Colunas: `cobranca_config_id:string`, `confirmado:boolean`, `confirmado_data:string | null`, `confirmado_por:string | null`, `created_at:string`, `id:string`, `solicitacao_id:string`, `updated_at:string`
- PK: `id` (inferido)
- FKs: `cobranca_config_id` -> `lancamento_cobranca_config.id`; `solicitacao_id` -> `solicitacoes.id`
- Índices: n/d
- Constraints: n/d
- Triggers: n/d

### `modelo_relatorio_colunas`
- Colunas: `campo_sistema:string | null`, `coluna_modelo:string`, `created_at:string`, `id:string`, `modelo_id:string`, `ordem:number`
- PK: `id` (inferido)
- FKs: `modelo_id` -> `modelos_relatorio.id`
- Índices: n/d
- Constraints: n/d
- Triggers: n/d

### `modelos_relatorio`
- Colunas: `ativo:boolean`, `created_at:string`, `criado_por:string | null`, `descricao:string | null`, `file_name:string`, `file_path:string`, `file_size:number | null`, `file_url:string | null`, `id:string`, `nome:string`, `tipo:string`, `updated_at:string`
- PK: `id` (inferido)
- FKs: nenhuma
- Índices: n/d
- Constraints: n/d
- Triggers: n/d

### `notification_rules`
- Colunas: `ativo:boolean`, `created_at:string`, `id:string`, `servico_id:string`, `setor_ids:string[] | null`, `status_gatilho:string`, `tipos_notificacao:string[]`, `updated_at:string`
- PK: `id` (inferido)
- FKs: `servico_id` -> `servicos.id`
- Índices: n/d
- Constraints: n/d
- Triggers: n/d

### `notifications`
- Colunas: `created_at:string`, `id:string`, `lida:boolean`, `mensagem:string`, `solicitacao_id:string | null`, `tipo:string`, `usuario_id:string | null`
- PK: `id` (inferido)
- FKs: `solicitacao_id` -> `solicitacoes.id`
- Índices: idx_notifications_usuario (usuario_id) [20260208173021_da0b55cd-e5aa-4045-b6db-b7365f7e53cc.sql]
- Constraints: n/d
- Triggers: n/d

### `observacao_historico`
- Colunas: `autor_id:string`, `autor_nome:string | null`, `created_at:string`, `id:string`, `observacao:string`, `solicitacao_id:string`, `status_no_momento:string`, `tipo_observacao:string`
- PK: `id` (inferido)
- FKs: `solicitacao_id` -> `solicitacoes.id`
- Índices: n/d
- Constraints: observacao_length: CHECK (length(observacao) <= 10000) [20260211051659_ea7e272f-5b97-4ab1-a9d0-4e814c063bb0.sql]
- Triggers: n/d

### `page_config`
- Colunas: `config_key:string`, `config_type:string | null`, `config_value:string | null`, `created_at:string | null`, `description:string | null`, `id:string`, `is_active:boolean | null`, `updated_at:string | null`
- PK: `id` (inferido)
- FKs: nenhuma
- Índices: n/d
- Constraints: n/d
- Triggers: n/d

### `parametros_campos`
- Colunas: `ativo:boolean`, `created_at:string`, `grupo:string`, `grupo_status:string`, `id:string`, `ordem:number`, `servico_ids:string[]`, `sigla:string | null`, `tipo_resultado:string | null`, `updated_at:string`, `valor:string`
- PK: `id` (inferido)
- FKs: nenhuma
- Índices: n/d
- Constraints: n/d
- Triggers: n/d

### `pendencia_opcoes`
- Colunas: `ativo:boolean`, `created_at:string`, `id:string`, `ordem:number`, `updated_at:string`, `valor:string`
- PK: `id` (inferido)
- FKs: nenhuma
- Índices: n/d
- Constraints: n/d
- Triggers: n/d

### `pergunta_condicionais`
- Colunas: `created_at:string`, `formulario_id:string`, `id:string`, `operador:string`, `pergunta_id:string`, `pergunta_pai_id:string`, `valor_gatilho:string`
- PK: `id` (inferido)
- FKs: `formulario_id` -> `formularios.id`; `pergunta_id` -> `banco_perguntas.id`; `pergunta_pai_id` -> `banco_perguntas.id`
- Índices: idx_pergunta_condicionais_form (formulario_id) [20260214061750_344d3117-24ee-4aa1-bf9c-b38680e7df3b.sql]; idx_pergunta_condicionais_pai (pergunta_pai_id) [20260214061750_344d3117-24ee-4aa1-bf9c-b38680e7df3b.sql]
- Constraints: n/d
- Triggers: n/d

### `pergunta_mapeamento`
- Colunas: `campo_analise_id:string | null`, `campo_solicitacao:string`, `created_at:string`, `formulario_id:string`, `id:string`, `pergunta_id:string`
- PK: `id` (inferido)
- FKs: `campo_analise_id` -> `campos_analise.id`; `formulario_id` -> `formularios.id`; `pergunta_id` -> `banco_perguntas.id`
- Índices: idx_pergunta_mapeamento_form (formulario_id) [20260214061750_344d3117-24ee-4aa1-bf9c-b38680e7df3b.sql]
- Constraints: n/d
- Triggers: n/d

### `profiles`
- Colunas: `bloqueado:boolean`, `created_at:string`, `email:string`, `email_setor:string | null`, `id:string`, `nome:string | null`, `setor:Database["public"]["Enums"]["setor_tipo"] | null`, `updated_at:string`
- PK: `id` (inferido)
- FKs: `email_setor` -> `setor_emails.email_setor`
- Índices: n/d
- Constraints: email_format: CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$') [20260211061628_16cd9d0e-d6d6-4b47-b01c-cee3ada0eee1.sql]
- Triggers: aaa_encrypt_profiles: BEFORE INSERT OR UPDATE on FOR EACH ROW EXECUTE FUNCTION public.trigger_encrypt_profiles() [20260301032749_ce3cba1d-b8fa-469c-a1d0-9efebae9e351.sql]

### `protocol_config`
- Colunas: `ano_referencia:number | null`, `created_at:string`, `id:string`, `prefixo:string`, `servico_id:string | null`, `ultimo_numero:number`, `updated_at:string`
- PK: `id` (inferido)
- FKs: `servico_id` -> `servicos.id`
- Índices: n/d
- Constraints: n/d
- Triggers: n/d

### `regras_servico`
- Colunas: `agendar_proximo_dia:boolean`, `aplica_dia_anterior:boolean`, `ativo:boolean`, `created_at:string`, `dias_semana:string[]`, `hora_corte:string`, `horarios_por_dia:Json | null`, `id:string`, `limite_dia:number | null`, `limite_qua:number | null`, `limite_qui:number | null`, `limite_sab:number | null`, `limite_seg:number | null`, `limite_sex:number | null`, `limite_ter:number | null`, `recusar_apos_corte:boolean`, `servico_id:string`, `updated_at:string`, `usar_horario_por_dia:boolean`
- PK: `id` (inferido)
- FKs: `servico_id` -> `servicos.id`
- Índices: n/d
- Constraints: n/d
- Triggers: n/d

### `service_routing_rules`
- Colunas: `ativo:boolean | null`, `campo_criterio:string`, `created_at:string | null`, `id:string`, `servico_id:string | null`, `setor_ids:string[]`, `updated_at:string | null`, `valor_criterio:string`
- PK: `id` (inferido)
- FKs: `servico_id` -> `servicos.id`
- Índices: n/d
- Constraints: n/d
- Triggers: n/d

### `servicos`
- Colunas: `anexos_embutidos:boolean | null`, `aprovacao_administrativo:boolean | null`, `aprovacao_ativada:boolean | null`, `aprovacao_operacional:boolean | null`, `ativo:boolean`, `codigo_prefixo:string`, `created_at:string`, `deferimento_embutidos:boolean`, `deferimento_pendencias_ativacao:string[] | null`, `deferimento_status_ativacao:string[] | null`, `descricao:string | null`, `id:string`, `lacre_armador_pendencias_ativacao:string[] | null`, `lacre_armador_status_ativacao:string[] | null`, `nome:string`, `status_confirmacao_lancamento:string[] | null`, `tipo_agendamento:string | null`, `updated_at:string`
- PK: `id` (inferido)
- FKs: nenhuma
- Índices: n/d
- Constraints: n/d
- Triggers: n/d

### `setor_emails`
- Colunas: `ativo:boolean`, `created_at:string`, `descricao:string | null`, `email_setor:string`, `id:string`, `perfis:string[] | null`, `setor:Database["public"]["Enums"]["setor_tipo"]`
- PK: `id` (inferido)
- FKs: nenhuma
- Índices: n/d
- Constraints: n/d
- Triggers: n/d

### `setor_servicos`
- Colunas: `created_at:string`, `id:string`, `servico_id:string`, `setor_email_id:string`
- PK: `id` (inferido)
- FKs: `servico_id` -> `servicos.id`; `setor_email_id` -> `setor_emails.id`
- Índices: n/d
- Constraints: n/d
- Triggers: n/d

### `solicitacoes`
- Colunas: `armazem_aprovado:boolean | null`, `armazem_data:string | null`, `armazem_justificativa:string | null`, `armazem_usuario_id:string | null`, `cancelamento_solicitado:boolean | null`, `cancelamento_solicitado_em:string | null`, `categoria:string | null`, `chave_consulta:string`, `cliente_email:string`, `cliente_email_hash:string | null`, `cliente_nome:string`, `cliente_nome_hash:string | null`, `cnpj:string | null`, `cnpj_hash:string | null`, `comex_aprovado:boolean | null`, `comex_data:string | null`, `comex_justificativa:string | null`, `comex_usuario_id:string | null`, `created_at:string`, `custo_posicionamento:boolean | null`, `data_agendamento:string | null`, `data_posicionamento:string | null`, `formulario_id:string | null`, `id:string`, `lacre_armador_aceite_custo:boolean | null`, `lacre_armador_possui:boolean | null`, `lancamento_confirmado:boolean | null`, `lancamento_confirmado_data:string | null`, `lancamento_confirmado_por:string | null`, `lpco:string | null`, `numero_conteiner:string | null`, `observacoes:string | null`, `pendencias_selecionadas:string[] | null`, `protocolo:string`, `solicitar_deferimento:boolean | null`, `solicitar_lacre_armador:boolean | null`, `status:Database["public"]["Enums"]["status_solicitacao"]`, `status_vistoria:string | null`, `tipo_carga:string | null`, `tipo_operacao:string | null`, `updated_at:string`
- PK: `id` (inferido)
- FKs: `formulario_id` -> `formularios.id`
- Índices: idx_solicitacoes_protocolo (protocolo) [20260208173021_da0b55cd-e5aa-4045-b6db-b7365f7e53cc.sql]; idx_solicitacoes_lpco (lpco) [20260208173021_da0b55cd-e5aa-4045-b6db-b7365f7e53cc.sql]; idx_solicitacoes_conteiner (numero_conteiner) [20260208173021_da0b55cd-e5aa-4045-b6db-b7365f7e53cc.sql]; idx_solicitacoes_status (status) [20260208173021_da0b55cd-e5aa-4045-b6db-b7365f7e53cc.sql]; idx_solicitacoes_chave_consulta (chave_consulta) [20260215185009_e263c04f-1510-4445-b6d9-464ffaa000a6.sql]; idx_solicitacoes_formulario_id (formulario_id) [20260303012026_97c847eb-ca40-4a41-a6f1-540206da21f5.sql]
- Constraints: observacoes_length: CHECK (length(observacoes) <= 10000),
  ADD CONSTRAINT protocolo_length CHECK (length(protocolo) <= 50),
  ADD CONSTRAINT cliente_nome_length CHECK (length(cliente_nome) <= 255),
  ADD CONSTRAINT cliente_email_length CHECK (length(cliente_email) <= 255) [20260211051659_ea7e272f-5b97-4ab1-a9d0-4e814c063bb0.sql]; cliente_email_format: CHECK (cliente_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$') [20260211061628_16cd9d0e-d6d6-4b47-b01c-cee3ada0eee1.sql]
- Triggers: trigger_update_solicitacao_status: BEFORE UPDATE on FOR EACH ROW
EXECUTE FUNCTION public.update_solicitacao_status() [20260208173021_da0b55cd-e5aa-4045-b6db-b7365f7e53cc.sql]; aaa_encrypt_solicitacoes: BEFORE INSERT OR UPDATE on FOR EACH ROW EXECUTE FUNCTION public.trigger_encrypt_solicitacoes() [20260301032749_ce3cba1d-b8fa-469c-a1d0-9efebae9e351.sql]

### `system_config`
- Colunas: `config_key:string`, `config_type:string`, `config_value:string | null`, `created_at:string`, `description:string | null`, `id:string`, `is_active:boolean`, `updated_at:string`
- PK: `id` (inferido)
- FKs: nenhuma
- Índices: n/d
- Constraints: n/d
- Triggers: n/d

### `tipos_setor`
- Colunas: `ativo:boolean`, `created_at:string`, `descricao:string | null`, `id:string`, `nome:string`, `pode_aprovar:boolean`, `pode_editar_processo:boolean`, `pode_recusar:boolean`, `pode_visualizar_todos:boolean`, `updated_at:string`
- PK: `id` (inferido)
- FKs: nenhuma
- Índices: n/d
- Constraints: n/d
- Triggers: n/d

### `user_roles`
- Colunas: `created_at:string`, `id:string`, `role:Database["public"]["Enums"]["app_role"]`, `user_id:string`
- PK: `id` (inferido)
- FKs: nenhuma
- Índices: n/d
- Constraints: n/d
- Triggers: n/d

### Relacionamentos

- `audit_log.solicitacao_id` -> `solicitacoes.id`

- `campos_analise_valores.campo_id` -> `campos_analise.id`

- `campos_analise_valores.solicitacao_id` -> `solicitacoes.id`

- `deferimento_documents.solicitacao_id` -> `solicitacoes.id`

- `external_buttons.formulario_id` -> `formularios.id`

- `field_mappings.integracao_id` -> `integracoes.id`

- `formulario_campos.formulario_id` -> `formularios.id`

- `formulario_perguntas.formulario_id` -> `formularios.id`

- `formulario_perguntas.pergunta_id` -> `banco_perguntas.id`

- `formulario_respostas.formulario_id` -> `formularios.id`

- `formularios.servico_id` -> `servicos.id`

- `integration_history.solicitacao_id` -> `solicitacoes.id`

- `lacre_armador_dados.solicitacao_id` -> `solicitacoes.id`

- `lancamento_cobranca_registros.cobranca_config_id` -> `lancamento_cobranca_config.id`

- `lancamento_cobranca_registros.solicitacao_id` -> `solicitacoes.id`

- `modelo_relatorio_colunas.modelo_id` -> `modelos_relatorio.id`

- `notification_rules.servico_id` -> `servicos.id`

- `notifications.solicitacao_id` -> `solicitacoes.id`

- `observacao_historico.solicitacao_id` -> `solicitacoes.id`

- `pergunta_condicionais.formulario_id` -> `formularios.id`

- `pergunta_condicionais.pergunta_id` -> `banco_perguntas.id`

- `pergunta_condicionais.pergunta_pai_id` -> `banco_perguntas.id`

- `pergunta_mapeamento.campo_analise_id` -> `campos_analise.id`

- `pergunta_mapeamento.formulario_id` -> `formularios.id`

- `pergunta_mapeamento.pergunta_id` -> `banco_perguntas.id`

- `profiles.email_setor` -> `setor_emails.email_setor`

- `protocol_config.servico_id` -> `servicos.id`

- `regras_servico.servico_id` -> `servicos.id`

- `service_routing_rules.servico_id` -> `servicos.id`

- `setor_servicos.servico_id` -> `servicos.id`

- `setor_servicos.setor_email_id` -> `setor_emails.id`

- `solicitacoes.formulario_id` -> `formularios.id`

## FASE 3 — Queries

- `src/components/AnaliseDialog.tsx` | from: campos_analise_valores, campos_fixos_config, cancelamento_recusa_config, deferimento_documents, external_buttons, form-uploads, formulario_perguntas, formulario_respostas, lancamento_cobranca_config, lancamento_cobranca_registros, observacao_historico, parametros_campos, pergunta_mapeamento, servicos, solicitacoes | invoke: notificar-status | rpc: create_notifications_for_others, insert_audit_log

- `src/components/BatchApprovalDialog.tsx` | from: integration_history, solicitacoes | invoke: - | rpc: insert_audit_log

- `src/components/BatchBillingDialog.tsx` | from: lancamento_cobranca_config, lancamento_cobranca_registros | invoke: - | rpc: -

- `src/components/BatchStatusDialog.tsx` | from: solicitacoes | invoke: - | rpc: insert_audit_log

- `src/components/BillingConfirmDialog.tsx` | from: lancamento_cobranca_config, lancamento_cobranca_registros, solicitacoes | invoke: - | rpc: insert_audit_log

- `src/components/ConsultaResultado.tsx` | from: - | invoke: upload-publico | rpc: -

- `src/components/DeferimentoDialog.tsx` | from: deferimento, deferimento_documents, servicos | invoke: - | rpc: create_notifications_for_others, insert_audit_log

- `src/components/ExcelExportDialog.tsx` | from: servicos | invoke: - | rpc: -

- `src/components/ExcelImportMappings.tsx` | from: field_mappings | invoke: - | rpc: -

- `src/components/ExternalButtonsManager.tsx` | from: external_buttons, formularios | invoke: - | rpc: -

- `src/components/ExternalHeader.tsx` | from: page_config | invoke: - | rpc: -

- `src/components/ExtrairRelatorioDialog.tsx` | from: modelo_relatorio_colunas, modelos_relatorio | invoke: - | rpc: -

- `src/components/FormRenderer.tsx` | from: formulario_perguntas, formularios, page_config, pergunta_condicionais, pergunta_mapeamento, protocol_config, solicitacoes | invoke: enviar-formulario, upload-publico | rpc: -

- `src/components/LacreArmadorDialog.tsx` | from: deferimento, deferimento_documents, lacre_armador_dados, solicitacoes | invoke: - | rpc: create_notifications_for_others, insert_audit_log

- `src/components/ModelosExcelDialog.tsx` | from: modelo_relatorio_colunas, modelos-relatorio, modelos_relatorio | invoke: - | rpc: -

- `src/components/NavisN4ExportDialog.tsx` | from: campos_analise, campos_analise_valores, servicos, solicitacoes | invoke: - | rpc: -

- `src/components/NotificationsPanel.tsx` | from: notifications | invoke: - | rpc: -

- `src/components/ParametrosCamposManager.tsx` | from: parametros_campos, servicos | invoke: - | rpc: -

- `src/components/ProcessoViewDialog.tsx` | from: campos_analise_valores, deferimento_documents, external_buttons, form-uploads, formulario_perguntas, formulario_respostas, pergunta_mapeamento, servicos, solicitacoes | invoke: notificar-status | rpc: insert_audit_log

- `src/components/ReativacaoDialog.tsx` | from: observacao_historico, profiles_v, solicitacoes | invoke: - | rpc: insert_audit_log

- `src/components/ReclassificacaoDialog.tsx` | from: notifications, profiles, solicitacoes | invoke: - | rpc: insert_audit_log

- `src/components/SetorSelector.tsx` | from: profiles, setor_emails | invoke: - | rpc: -

- `src/components/StatusCorrectionDialog.tsx` | from: observacao_historico, parametros_campos, solicitacoes | invoke: - | rpc: insert_audit_log

- `src/components/admin/BancoPerguntasManager.tsx` | from: banco_perguntas | invoke: - | rpc: -

- `src/components/admin/CamposDinamicosManager.tsx` | from: campos_analise, servicos | invoke: - | rpc: -

- `src/components/admin/CamposFixosManager.tsx` | from: campos_fixos_config, servicos | invoke: - | rpc: -

- `src/components/admin/CancelamentoRecusaManager.tsx` | from: cancelamento_recusa_config, parametros_campos, servicos | invoke: - | rpc: -

- `src/components/admin/ConsultaEtapasManager.tsx` | from: consulta_etapas_config | invoke: - | rpc: -

- `src/components/admin/EstilosFormularioManager.tsx` | from: estilos_formulario | invoke: - | rpc: -

- `src/components/admin/FormularioBuilder.tsx` | from: banco_perguntas, campos_analise, formulario_perguntas, pergunta_condicionais, pergunta_mapeamento | invoke: - | rpc: -

- `src/components/admin/LancamentoCobrancaManager.tsx` | from: lancamento_cobranca_config, parametros_campos, servicos | invoke: - | rpc: -

- `src/components/admin/PaginaExternaConfigManager.tsx` | from: deferimento_titulos, page_config, servicos, system_config | invoke: - | rpc: -

- `src/components/admin/ProtocolCountByService.tsx` | from: solicitacoes | invoke: - | rpc: -

- `src/components/admin/ReportColumnMappingDialog.tsx` | from: modelo_relatorio_colunas, modelos-relatorio, modelos_relatorio | invoke: - | rpc: -

- `src/components/admin/ReportDownloadDialog.tsx` | from: lancamento_cobranca_registros, modelo_relatorio_colunas, parametros_campos, servicos | invoke: - | rpc: -

- `src/components/admin/ToggleActivationManager.tsx` | from: parametros_campos, servicos | invoke: - | rpc: -

- `src/hooks/useAdminCheck.ts` | from: user_roles | invoke: - | rpc: -

- `src/hooks/useGestorCheck.ts` | from: profiles, user_roles | invoke: - | rpc: -

- `src/hooks/useNotifications.ts` | from: notifications | invoke: - | rpc: -

- `src/hooks/useStatusProcesso.ts` | from: parametros_campos | invoke: - | rpc: -

- `src/lib/tipoCarga.ts` | from: parametros_campos | invoke: - | rpc: -

- `src/pages/GestorRegras.tsx` | from: profiles, regras_servico, servicos, setor_emails, setor_servicos, user_roles | invoke: - | rpc: -

- `src/pages/Index.tsx` | from: external_buttons | invoke: consulta-publica | rpc: -

- `src/pages/InternoDashboard.tsx` | from: deferimento_documents, lancamento_cobranca_config, lancamento_cobranca_registros, notifications, servicos, setor_emails, setor_servicos, solicitacoes | invoke: - | rpc: -

- `src/pages/Relatorios.tsx` | from: modelo_relatorio_colunas, modelos-relatorio, modelos_relatorio | invoke: - | rpc: -

- `src/pages/admin/AdminFormularios.tsx` | from: estilos_formulario, formulario_campos, formulario_respostas, formularios, servicos | invoke: - | rpc: -

- `src/pages/admin/AdminHistoricoIntegracoes.tsx` | from: integration_history | invoke: - | rpc: -

- `src/pages/admin/AdminIntegracoes.tsx` | from: field_mappings, integracoes | invoke: - | rpc: -

- `src/pages/admin/AdminLogs.tsx` | from: audit_log | invoke: - | rpc: -

- `src/pages/admin/AdminParametros.tsx` | from: field_mappings, notification_rules, page_config, parametros_campos, protocol_config, regras_servico, service_routing_rules, servicos, setor_emails | invoke: - | rpc: -

- `src/pages/admin/AdminParametrosAjuda.tsx` | from: campos_analise, campos_fixos_config, lancamento_cobranca_config, pendencia_opcoes | invoke: - | rpc: -

- `src/pages/admin/AdminServicos.tsx` | from: parametros_campos, servicos, solicitacoes | invoke: - | rpc: -

- `src/pages/admin/AdminSetores.tsx` | from: profiles, servicos, setor_emails, setor_servicos | invoke: - | rpc: -

- `src/pages/admin/AdminUsuarios.tsx` | from: profiles, setor_emails, user_roles | invoke: admin-change-password | rpc: -

## FASE 4 — Backend APIs

### `/admin-change-password`
- Método: POST (via invoke) + OPTIONS
- Ações: sem switch
- Campos obrigatórios detectados: user_id
- Tabelas: profiles, user_roles

### `/admin-login`
- Método: POST (via invoke) + OPTIONS
- Ações: sem switch
- Campos obrigatórios detectados: n/d
- Tabelas: profiles, user_roles

### `/consulta-publica`
- Método: POST (via invoke) + OPTIONS
- Ações: sem switch
- Campos obrigatórios detectados: Chave
- Tabelas: campos_analise, campos_analise_valores, campos_fixos_config, consulta_etapas_config, deferimento, deferimento_documents, deferimento_titulos, form-uploads, formulario_perguntas, formulario_respostas, lacre_armador_dados, observacao_historico, parametros_campos, servicos, solicitacoes, system_config

### `/enviar-email`
- Método: POST (via invoke) + OPTIONS
- Ações: sem switch
- Campos obrigatórios detectados: Campos
- Tabelas: integracoes, integration_history

### `/enviar-formulario`
- Método: POST (via invoke) + OPTIONS
- Ações: save_email
- Campos obrigatórios detectados: formulario_id, protocolo
- Tabelas: campos_analise_valores, formulario_respostas, formularios, protocol_config, regras_servico, servicos, solicitacoes

### `/notificar-status`
- Método: POST (via invoke) + OPTIONS
- Ações: reenviar_chave
- Campos obrigatórios detectados: solicitacao_id
- Tabelas: notification_rules, notifications, parametros_campos, profiles, servicos, setor_emails, solicitacoes_v, user_roles

### `/upload-publico`
- Método: POST (via invoke) + OPTIONS
- Ações: aceite_custo_lacre, cancelar_solicitacao, submit_lacre_form, update_lacre_info
- Campos obrigatórios detectados: n/d
- Tabelas: deferimento_documents, lacre_armador_dados, notifications, profiles, servicos, setor_emails, setor_servicos, solicitacoes

## FASE 5 — Frontend

- Rota `/` -> `Index /`

- Rota `/servicos-adicionais` -> `Index /`

- Rota `/interno` -> `InternoLogin /`

- Rota `/recuperar-senha` -> `RecuperarSenha /`

- Rota `/interno/dashboard` -> `InternoDashboard /`

- Rota `/interno/admin/parametros` -> `AdminParametros /`

- Rota `/interno/admin/parametros/ajuda` -> `AdminParametrosAjuda /`

- Rota `/interno/admin/usuarios` -> `AdminUsuarios /`

- Rota `/interno/admin/setores` -> `AdminSetores /`

- Rota `/interno/admin/servicos` -> `AdminServicos /`

- Rota `/interno/admin/logs` -> `AdminLogs /`

- Rota `/interno/admin/integracoes` -> `AdminIntegracoes /`

- Rota `/interno/admin/historico-integracoes` -> `AdminHistoricoIntegracoes /`

- Rota `/interno/admin/formularios` -> `AdminFormularios /`

- Rota `/interno/gestor/regras` -> `GestorRegras /`

- Rota `/interno/relatorios` -> `Relatorios /`

- Rota `*` -> `NotFound /`

### `src/pages/GestorRegras.tsx`
- Estados: 10
- APIs: -
- Tabelas: profiles, regras_servico, servicos, setor_emails, setor_servicos, user_roles

### `src/pages/Index.tsx`
- Estados: 17
- APIs: consulta-publica
- Tabelas: external_buttons

### `src/pages/InternoDashboard.tsx`
- Estados: 36
- APIs: -
- Tabelas: deferimento_documents, lancamento_cobranca_config, lancamento_cobranca_registros, notifications, servicos, setor_emails, setor_servicos, solicitacoes

### `src/pages/InternoLogin.tsx`
- Estados: 1
- APIs: -
- Tabelas: -

### `src/pages/NotFound.tsx`
- Estados: 0
- APIs: -
- Tabelas: -

### `src/pages/RecuperarSenha.tsx`
- Estados: 5
- APIs: -
- Tabelas: -

### `src/pages/Relatorios.tsx`
- Estados: 11
- APIs: -
- Tabelas: modelo_relatorio_colunas, modelos-relatorio, modelos_relatorio

### `src/pages/admin/AdminFormularios.tsx`
- Estados: 15
- APIs: -
- Tabelas: estilos_formulario, formulario_campos, formulario_respostas, formularios, servicos

### `src/pages/admin/AdminHistoricoIntegracoes.tsx`
- Estados: 7
- APIs: -
- Tabelas: integration_history

### `src/pages/admin/AdminIntegracoes.tsx`
- Estados: 9
- APIs: -
- Tabelas: field_mappings, integracoes

### `src/pages/admin/AdminLogs.tsx`
- Estados: 6
- APIs: -
- Tabelas: audit_log

### `src/pages/admin/AdminParametros.tsx`
- Estados: 25
- APIs: -
- Tabelas: field_mappings, notification_rules, page_config, parametros_campos, protocol_config, regras_servico, service_routing_rules, servicos, setor_emails

### `src/pages/admin/AdminParametrosAjuda.tsx`
- Estados: 1
- APIs: -
- Tabelas: campos_analise, campos_fixos_config, lancamento_cobranca_config, pendencia_opcoes

### `src/pages/admin/AdminServicos.tsx`
- Estados: 7
- APIs: -
- Tabelas: parametros_campos, servicos, solicitacoes

### `src/pages/admin/AdminSetores.tsx`
- Estados: 10
- APIs: -
- Tabelas: profiles, servicos, setor_emails, setor_servicos

### `src/pages/admin/AdminUsuarios.tsx`
- Estados: 20
- APIs: admin-change-password
- Tabelas: profiles, setor_emails, user_roles

## FASE 6 — Bindings
- `FormRenderer.values` -> `enviar-formulario` -> `formulario_respostas`/`solicitacoes`/`campos_analise_valores`.
- Toggle e-mail: `PaginaExternaConfigManager.emailToggle` -> `page_config.solicitar_email_acompanhamento` -> `FormRenderer.showEmailField`.

## FASE 7 — Campos fixos/dinâmicos
- Fixos: `campos_fixos_config`; Dinâmicos: `campos_analise` + `campos_analise_valores`; filtros por serviço/visibilidade podem ocultar campos novos.

## FASE 8 — Bugs estruturais
- Alto: dualidade `formulario_campos` vs `formulario_perguntas`; acoplamento por `servicos.nome`; uso de `any` em fluxos críticos.
- Médio: validação HTTP parcial nas edges; lógica distribuída de notificação.

## FASE 9 — Conflitos FE↔BE
|Frontend|Backend|Banco|Problema|
|---|---|---|---|
|AdminFormularios|Builder/FormRenderer|formulario_campos + formulario_perguntas|dois modelos concorrentes|
|Toggle email|FormRenderer|page_config|erro de persistência sem rollback explícito|
|tipo_operacao (string)|lookup serviço por nome|servicos.nome|quebra possível em renomeação|

## FASE 10 — Problemas relatados
1) Toggle e-mail mapeado e persistido em `page_config`/`is_active`; consumo no FormRenderer.
2) Campos não aparecem: filtros `servico_ids` + `visivel_*` e exibição orientada a valores.
3) Erros frontend: risco por `any` e dados opcionais em cadeias longas.

## FASE 11 — Diagrama textual
`Frontend (React)` -> `Supabase client` -> `Edge Functions + RPC` -> `Postgres + Storage`.

## FASE 12 — Recomendações
1. Unificar modelo de formulários/campos.
2. Migrar acoplamentos para IDs.
3. Endurecer contratos e validações de API.
4. Reduzir `any` com tipagem de domínio.
