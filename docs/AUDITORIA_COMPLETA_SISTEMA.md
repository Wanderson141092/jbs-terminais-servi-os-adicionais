# Auditoria Completa do Sistema (Banco + Backend + Frontend)

## Escopo e método

- Auditoria estática baseada no código-fonte real do repositório (React + Supabase Edge Functions + migrations SQL).

- Fontes principais: `src/integrations/supabase/types.ts`, `supabase/migrations/*.sql`, `supabase/functions/*/index.ts`, `src/pages/*`, `src/components/*`.

- Nenhuma suposição operacional fora do que está implementado nos arquivos.


## ETAPA 1 — Mapeamento completo do banco de dados

### 1.1 Inventário de tabelas (detectadas: 44 tabelas de domínio)

#### Tabela: `_encryption_keys`

- Finalidade (inferida pelo uso no código):

  - Usada em frontend/backend para fluxos relacionados a `_encryption_keys`.

- Colunas (nome: tipo):

  - `id`: `number`

  - `key_value`: `string`

- PK: `id` (inferido)

- FKs: nenhuma declarada no type gerado.

- Índices (migrations): 0 ocorrência(s).

- Constraints adicionadas por migration: 0 ocorrência(s).

- Defaults alterados por migration: 0 ocorrência(s).

- Triggers (migrations): 0 ocorrência(s).


#### Tabela: `admin_accounts`

- Finalidade (inferida pelo uso no código):

  - Usada em frontend/backend para fluxos relacionados a `admin_accounts`.

- Colunas (nome: tipo):

  - `ativo`: `boolean | null`

  - `cpf`: `string`

  - `cpf_hash`: `string | null`

  - `created_at`: `string | null`

  - `id`: `string`

  - `nome`: `string`

  - `senha_hash`: `string`

  - `updated_at`: `string | null`

- PK: `id` (inferido)

- FKs: nenhuma declarada no type gerado.

- Índices (migrations): 0 ocorrência(s).

- Constraints adicionadas por migration: 1 ocorrência(s).

  - `nome_length`: CHECK (length(nome) <= 255),
  ADD CONSTRAINT cpf_length CHECK (length(cpf) <= 11) (20260211051659_ea7e272f-5b97-4ab1-a9d0-4e814c063bb0.sql)

- Defaults alterados por migration: 0 ocorrência(s).

- Triggers (migrations): 1 ocorrência(s).

  - `aaa_encrypt_admin_accounts`: BEFORE INSERT OR UPDATE on FOR EACH ROW EXECUTE FUNCTION public.trigger_encrypt_admin_accounts() (20260301032749_ce3cba1d-b8fa-469c-a1d0-9efebae9e351.sql)


#### Tabela: `audit_log`

- Finalidade (inferida pelo uso no código):

  - Usada em frontend/backend para fluxos relacionados a `audit_log`.

- Colunas (nome: tipo):

  - `acao`: `string`

  - `created_at`: `string`

  - `detalhes`: `string | null`

  - `entidade`: `string | null`

  - `entidade_id`: `string | null`

  - `id`: `string`

  - `solicitacao_id`: `string`

  - `usuario_id`: `string`

- PK: `id` (inferido)

- FKs:

  - `solicitacao_id` -> `solicitacoes.id` (`audit_log_solicitacao_id_fkey`)

- Índices (migrations): 1 ocorrência(s).

  - `idx_audit_solicitacao` em `(solicitacao_id)` (20260208173021_da0b55cd-e5aa-4045-b6db-b7365f7e53cc.sql)

- Constraints adicionadas por migration: 1 ocorrência(s).

  - `detalhes_length`: CHECK (length(detalhes) <= 10000) (20260211051659_ea7e272f-5b97-4ab1-a9d0-4e814c063bb0.sql)

- Defaults alterados por migration: 0 ocorrência(s).

- Triggers (migrations): 0 ocorrência(s).


#### Tabela: `banco_perguntas`

- Finalidade (inferida pelo uso no código):

  - Usada em frontend/backend para fluxos relacionados a `banco_perguntas`.

- Colunas (nome: tipo):

  - `ativo`: `boolean`

  - `config`: `Json | null`

  - `created_at`: `string`

  - `descricao`: `string | null`

  - `id`: `string`

  - `opcoes`: `Json | null`

  - `placeholder`: `string | null`

  - `rotulo`: `string`

  - `tipo`: `string`

  - `updated_at`: `string`

- PK: `id` (inferido)

- FKs: nenhuma declarada no type gerado.

- Índices (migrations): 0 ocorrência(s).

- Constraints adicionadas por migration: 0 ocorrência(s).

- Defaults alterados por migration: 0 ocorrência(s).

- Triggers (migrations): 0 ocorrência(s).


#### Tabela: `campos_analise`

- Finalidade (inferida pelo uso no código):

  - Usada em frontend/backend para fluxos relacionados a `campos_analise`.

- Colunas (nome: tipo):

  - `ativo`: `boolean`

  - `created_at`: `string`

  - `id`: `string`

  - `nome`: `string`

  - `obrigatorio`: `boolean`

  - `opcoes`: `Json | null`

  - `ordem`: `number`

  - `servico_ids`: `string[]`

  - `tipo`: `string`

  - `updated_at`: `string`

  - `visivel_externo`: `boolean`

- PK: `id` (inferido)

- FKs: nenhuma declarada no type gerado.

- Índices (migrations): 0 ocorrência(s).

- Constraints adicionadas por migration: 0 ocorrência(s).

- Defaults alterados por migration: 0 ocorrência(s).

- Triggers (migrations): 0 ocorrência(s).


#### Tabela: `campos_analise_valores`

- Finalidade (inferida pelo uso no código):

  - Usada em frontend/backend para fluxos relacionados a `campos_analise_valores`.

- Colunas (nome: tipo):

  - `campo_id`: `string`

  - `created_at`: `string`

  - `id`: `string`

  - `solicitacao_id`: `string`

  - `updated_at`: `string`

  - `valor`: `string | null`

- PK: `id` (inferido)

- FKs:

  - `campo_id` -> `campos_analise.id` (`campos_analise_valores_campo_id_fkey`)

  - `solicitacao_id` -> `solicitacoes.id` (`campos_analise_valores_solicitacao_id_fkey`)

- Índices (migrations): 0 ocorrência(s).

- Constraints adicionadas por migration: 0 ocorrência(s).

- Defaults alterados por migration: 0 ocorrência(s).

- Triggers (migrations): 0 ocorrência(s).


#### Tabela: `campos_fixos_config`

- Finalidade (inferida pelo uso no código):

  - Usada em frontend/backend para fluxos relacionados a `campos_fixos_config`.

- Colunas (nome: tipo):

  - `ativo`: `boolean`

  - `campo_chave`: `string`

  - `campo_label`: `string`

  - `created_at`: `string`

  - `id`: `string`

  - `obrigatorio_analise`: `boolean`

  - `ordem`: `number`

  - `servico_ids`: `string[]`

  - `updated_at`: `string`

  - `visivel_analise`: `boolean`

  - `visivel_externo`: `boolean`

- PK: `id` (inferido)

- FKs: nenhuma declarada no type gerado.

- Índices (migrations): 0 ocorrência(s).

- Constraints adicionadas por migration: 0 ocorrência(s).

- Defaults alterados por migration: 0 ocorrência(s).

- Triggers (migrations): 0 ocorrência(s).


#### Tabela: `cancelamento_recusa_config`

- Finalidade (inferida pelo uso no código):

  - Usada em frontend/backend para fluxos relacionados a `cancelamento_recusa_config`.

- Colunas (nome: tipo):

  - `ativo`: `boolean`

  - `created_at`: `string`

  - `id`: `string`

  - `servico_ids`: `string[]`

  - `status_habilitados`: `string[]`

  - `tipo`: `string`

  - `updated_at`: `string`

- PK: `id` (inferido)

- FKs: nenhuma declarada no type gerado.

- Índices (migrations): 0 ocorrência(s).

- Constraints adicionadas por migration: 0 ocorrência(s).

- Defaults alterados por migration: 0 ocorrência(s).

- Triggers (migrations): 0 ocorrência(s).


#### Tabela: `consulta_etapas_config`

- Finalidade (inferida pelo uso no código):

  - Usada em frontend/backend para fluxos relacionados a `consulta_etapas_config`.

- Colunas (nome: tipo):

  - `ativo`: `boolean`

  - `chave`: `string`

  - `created_at`: `string`

  - `descricao`: `string | null`

  - `etapa_equivalente`: `string | null`

  - `grupo`: `string`

  - `id`: `string`

  - `ordem`: `number`

  - `servico_ids`: `string[]`

  - `status_gatilho`: `string[] | null`

  - `tipo`: `string`

  - `titulo`: `string`

  - `updated_at`: `string`

- PK: `id` (inferido)

- FKs: nenhuma declarada no type gerado.

- Índices (migrations): 0 ocorrência(s).

- Constraints adicionadas por migration: 0 ocorrência(s).

- Defaults alterados por migration: 0 ocorrência(s).

- Triggers (migrations): 0 ocorrência(s).


#### Tabela: `deferimento_documents`

- Finalidade (inferida pelo uso no código):

  - Usada em frontend/backend para fluxos relacionados a `deferimento_documents`.

- Colunas (nome: tipo):

  - `created_at`: `string`

  - `document_type`: `string`

  - `file_name`: `string`

  - `file_url`: `string`

  - `id`: `string`

  - `motivo_recusa`: `string | null`

  - `solicitacao_id`: `string`

  - `status`: `string | null`

- PK: `id` (inferido)

- FKs:

  - `solicitacao_id` -> `solicitacoes.id` (`deferimento_documents_solicitacao_id_fkey`)

- Índices (migrations): 1 ocorrência(s).

  - `idx_deferimento_documents_solicitacao_type` em `(solicitacao_id, document_type, created_at DESC)` (20260209071746_5d4e0405-d994-40ee-bab7-4b526d862600.sql)

- Constraints adicionadas por migration: 0 ocorrência(s).

- Defaults alterados por migration: 0 ocorrência(s).

- Triggers (migrations): 0 ocorrência(s).


#### Tabela: `deferimento_titulos`

- Finalidade (inferida pelo uso no código):

  - Usada em frontend/backend para fluxos relacionados a `deferimento_titulos`.

- Colunas (nome: tipo):

  - `ativo`: `boolean`

  - `created_at`: `string`

  - `id`: `string`

  - `servico_ids`: `string[]`

  - `titulo`: `string`

  - `updated_at`: `string`

- PK: `id` (inferido)

- FKs: nenhuma declarada no type gerado.

- Índices (migrations): 0 ocorrência(s).

- Constraints adicionadas por migration: 0 ocorrência(s).

- Defaults alterados por migration: 0 ocorrência(s).

- Triggers (migrations): 0 ocorrência(s).


#### Tabela: `estilos_formulario`

- Finalidade (inferida pelo uso no código):

  - Usada em frontend/backend para fluxos relacionados a `estilos_formulario`.

- Colunas (nome: tipo):

  - `ativo`: `boolean`

  - `chave`: `string`

  - `config`: `Json`

  - `created_at`: `string`

  - `descricao`: `string | null`

  - `features`: `string[]`

  - `id`: `string`

  - `nome`: `string`

  - `ordem`: `number`

  - `updated_at`: `string`

- PK: `id` (inferido)

- FKs: nenhuma declarada no type gerado.

- Índices (migrations): 0 ocorrência(s).

- Constraints adicionadas por migration: 0 ocorrência(s).

- Defaults alterados por migration: 0 ocorrência(s).

- Triggers (migrations): 0 ocorrência(s).


#### Tabela: `external_buttons`

- Finalidade (inferida pelo uso no código):

  - Usada em frontend/backend para fluxos relacionados a `external_buttons`.

- Colunas (nome: tipo):

  - `abrir_nova_aba`: `boolean | null`

  - `ativo`: `boolean`

  - `created_at`: `string`

  - `descricao`: `string | null`

  - `formulario_id`: `string | null`

  - `icone`: `string | null`

  - `id`: `string`

  - `ordem`: `number`

  - `tipo`: `string`

  - `titulo`: `string`

  - `updated_at`: `string`

  - `url`: `string | null`

- PK: `id` (inferido)

- FKs:

  - `formulario_id` -> `formularios.id` (`external_buttons_formulario_id_fkey`)

- Índices (migrations): 0 ocorrência(s).

- Constraints adicionadas por migration: 2 ocorrência(s).

  - `external_buttons_formulario_id_fkey`: FOREIGN KEY (formulario_id) REFERENCES public.formularios(id) ON DELETE SET NULL (20260209080851_8520b2fd-d3f3-4e0a-8b6f-b0d74a1ffee6.sql)

  - `url_scheme_check`: CHECK (url IS NULL OR url ~* '^https?://') (20260211061628_16cd9d0e-d6d6-4b47-b01c-cee3ada0eee1.sql)

- Defaults alterados por migration: 0 ocorrência(s).

- Triggers (migrations): 0 ocorrência(s).


#### Tabela: `field_mappings`

- Finalidade (inferida pelo uso no código):

  - Usada em frontend/backend para fluxos relacionados a `field_mappings`.

- Colunas (nome: tipo):

  - `campo_externo`: `string`

  - `campo_interno`: `string`

  - `created_at`: `string`

  - `descricao`: `string | null`

  - `direcao`: `string`

  - `id`: `string`

  - `integracao_id`: `string | null`

  - `sistema`: `string | null`

- PK: `id` (inferido)

- FKs:

  - `integracao_id` -> `integracoes.id` (`field_mappings_integracao_id_fkey`)

- Índices (migrations): 0 ocorrência(s).

- Constraints adicionadas por migration: 0 ocorrência(s).

- Defaults alterados por migration: 0 ocorrência(s).

- Triggers (migrations): 0 ocorrência(s).


#### Tabela: `formulario_campos`

- Finalidade (inferida pelo uso no código):

  - Usada em frontend/backend para fluxos relacionados a `formulario_campos`.

- Colunas (nome: tipo):

  - `condicao`: `Json | null`

  - `created_at`: `string`

  - `formulario_id`: `string`

  - `id`: `string`

  - `obrigatorio`: `boolean`

  - `opcoes`: `Json | null`

  - `ordem`: `number`

  - `placeholder`: `string | null`

  - `rotulo`: `string`

  - `tipo`: `string`

- PK: `id` (inferido)

- FKs:

  - `formulario_id` -> `formularios.id` (`formulario_campos_formulario_id_fkey`)

- Índices (migrations): 0 ocorrência(s).

- Constraints adicionadas por migration: 0 ocorrência(s).

- Defaults alterados por migration: 0 ocorrência(s).

- Triggers (migrations): 0 ocorrência(s).


#### Tabela: `formulario_perguntas`

- Finalidade (inferida pelo uso no código):

  - Usada em frontend/backend para fluxos relacionados a `formulario_perguntas`.

- Colunas (nome: tipo):

  - `created_at`: `string`

  - `formulario_id`: `string`

  - `id`: `string`

  - `obrigatorio`: `boolean`

  - `ordem`: `number`

  - `pergunta_id`: `string`

- PK: `id` (inferido)

- FKs:

  - `formulario_id` -> `formularios.id` (`formulario_perguntas_formulario_id_fkey`)

  - `pergunta_id` -> `banco_perguntas.id` (`formulario_perguntas_pergunta_id_fkey`)

- Índices (migrations): 2 ocorrência(s).

  - `idx_formulario_perguntas_form` em `(formulario_id)` (20260214061750_344d3117-24ee-4aa1-bf9c-b38680e7df3b.sql)

  - `idx_formulario_perguntas_perg` em `(pergunta_id)` (20260214061750_344d3117-24ee-4aa1-bf9c-b38680e7df3b.sql)

- Constraints adicionadas por migration: 0 ocorrência(s).

- Defaults alterados por migration: 0 ocorrência(s).

- Triggers (migrations): 0 ocorrência(s).


#### Tabela: `formulario_respostas`

- Finalidade (inferida pelo uso no código):

  - Usada em frontend/backend para fluxos relacionados a `formulario_respostas`.

- Colunas (nome: tipo):

  - `arquivos`: `Json | null`

  - `created_at`: `string`

  - `formulario_id`: `string`

  - `id`: `string`

  - `ip_address`: `string | null`

  - `respostas`: `Json`

- PK: `id` (inferido)

- FKs:

  - `formulario_id` -> `formularios.id` (`formulario_respostas_formulario_id_fkey`)

- Índices (migrations): 0 ocorrência(s).

- Constraints adicionadas por migration: 0 ocorrência(s).

- Defaults alterados por migration: 0 ocorrência(s).

- Triggers (migrations): 0 ocorrência(s).


#### Tabela: `formularios`

- Finalidade (inferida pelo uso no código):

  - Usada em frontend/backend para fluxos relacionados a `formularios`.

- Colunas (nome: tipo):

  - `ativo`: `boolean`

  - `created_at`: `string`

  - `descricao`: `string | null`

  - `estilo`: `string`

  - `id`: `string`

  - `servico_id`: `string | null`

  - `titulo`: `string`

  - `updated_at`: `string`

- PK: `id` (inferido)

- FKs:

  - `servico_id` -> `servicos.id` (`formularios_servico_id_fkey`)

- Índices (migrations): 0 ocorrência(s).

- Constraints adicionadas por migration: 0 ocorrência(s).

- Defaults alterados por migration: 0 ocorrência(s).

- Triggers (migrations): 0 ocorrência(s).


#### Tabela: `integracoes`

- Finalidade (inferida pelo uso no código):

  - Usada em frontend/backend para fluxos relacionados a `integracoes`.

- Colunas (nome: tipo):

  - `api_key`: `string | null`

  - `ativo`: `boolean`

  - `config`: `Json | null`

  - `created_at`: `string`

  - `id`: `string`

  - `nome`: `string`

  - `tipo`: `string`

  - `updated_at`: `string`

  - `url`: `string | null`

- PK: `id` (inferido)

- FKs: nenhuma declarada no type gerado.

- Índices (migrations): 0 ocorrência(s).

- Constraints adicionadas por migration: 1 ocorrência(s).

  - `url_scheme_check`: CHECK (url IS NULL OR url ~* '^https?://') (20260211061628_16cd9d0e-d6d6-4b47-b01c-cee3ada0eee1.sql)

- Defaults alterados por migration: 0 ocorrência(s).

- Triggers (migrations): 0 ocorrência(s).


#### Tabela: `integration_history`

- Finalidade (inferida pelo uso no código):

  - Usada em frontend/backend para fluxos relacionados a `integration_history`.

- Colunas (nome: tipo):

  - `created_at`: `string | null`

  - `detalhes`: `string | null`

  - `id`: `string`

  - `integracao_nome`: `string`

  - `payload`: `Json | null`

  - `response`: `Json | null`

  - `solicitacao_id`: `string | null`

  - `status`: `string`

  - `tipo`: `string`

- PK: `id` (inferido)

- FKs:

  - `solicitacao_id` -> `solicitacoes.id` (`integration_history_solicitacao_id_fkey`)

- Índices (migrations): 0 ocorrência(s).

- Constraints adicionadas por migration: 0 ocorrência(s).

- Defaults alterados por migration: 0 ocorrência(s).

- Triggers (migrations): 0 ocorrência(s).


#### Tabela: `lacre_armador_dados`

- Finalidade (inferida pelo uso no código):

  - Usada em frontend/backend para fluxos relacionados a `lacre_armador_dados`.

- Colunas (nome: tipo):

  - `confirmado_data`: `string | null`

  - `confirmado_por`: `string | null`

  - `created_at`: `string`

  - `data_posicionamento_lacre`: `string | null`

  - `foto_lacre_path`: `string | null`

  - `foto_lacre_url`: `string | null`

  - `id`: `string`

  - `lacre_coletado`: `boolean | null`

  - `lacre_status`: `string`

  - `motivo_recusa`: `string | null`

  - `periodo_lacre`: `string | null`

  - `responsavel_email`: `string | null`

  - `responsavel_nome`: `string | null`

  - `responsavel_telefone`: `string | null`

  - `solicitacao_id`: `string`

  - `updated_at`: `string`

- PK: `id` (inferido)

- FKs:

  - `solicitacao_id` -> `solicitacoes.id` (`lacre_armador_dados_solicitacao_id_fkey`)

- Índices (migrations): 0 ocorrência(s).

- Constraints adicionadas por migration: 0 ocorrência(s).

- Defaults alterados por migration: 0 ocorrência(s).

- Triggers (migrations): 0 ocorrência(s).


#### Tabela: `lancamento_cobranca_config`

- Finalidade (inferida pelo uso no código):

  - Usada em frontend/backend para fluxos relacionados a `lancamento_cobranca_config`.

- Colunas (nome: tipo):

  - `ativo`: `boolean`

  - `campo_referencia`: `string | null`

  - `created_at`: `string`

  - `id`: `string`

  - `nome`: `string`

  - `rotulo_analise`: `string`

  - `servico_ids`: `string[]`

  - `status_ativacao`: `string[]`

  - `tipo`: `string`

  - `updated_at`: `string`

- PK: `id` (inferido)

- FKs: nenhuma declarada no type gerado.

- Índices (migrations): 0 ocorrência(s).

- Constraints adicionadas por migration: 0 ocorrência(s).

- Defaults alterados por migration: 0 ocorrência(s).

- Triggers (migrations): 0 ocorrência(s).


#### Tabela: `lancamento_cobranca_registros`

- Finalidade (inferida pelo uso no código):

  - Usada em frontend/backend para fluxos relacionados a `lancamento_cobranca_registros`.

- Colunas (nome: tipo):

  - `cobranca_config_id`: `string`

  - `confirmado`: `boolean`

  - `confirmado_data`: `string | null`

  - `confirmado_por`: `string | null`

  - `created_at`: `string`

  - `id`: `string`

  - `solicitacao_id`: `string`

  - `updated_at`: `string`

- PK: `id` (inferido)

- FKs:

  - `cobranca_config_id` -> `lancamento_cobranca_config.id` (`lancamento_cobranca_registros_cobranca_config_id_fkey`)

  - `solicitacao_id` -> `solicitacoes.id` (`lancamento_cobranca_registros_solicitacao_id_fkey`)

- Índices (migrations): 0 ocorrência(s).

- Constraints adicionadas por migration: 0 ocorrência(s).

- Defaults alterados por migration: 0 ocorrência(s).

- Triggers (migrations): 0 ocorrência(s).


#### Tabela: `modelo_relatorio_colunas`

- Finalidade (inferida pelo uso no código):

  - Usada em frontend/backend para fluxos relacionados a `modelo_relatorio_colunas`.

- Colunas (nome: tipo):

  - `campo_sistema`: `string | null`

  - `coluna_modelo`: `string`

  - `created_at`: `string`

  - `id`: `string`

  - `modelo_id`: `string`

  - `ordem`: `number`

- PK: `id` (inferido)

- FKs:

  - `modelo_id` -> `modelos_relatorio.id` (`modelo_relatorio_colunas_modelo_id_fkey`)

- Índices (migrations): 0 ocorrência(s).

- Constraints adicionadas por migration: 0 ocorrência(s).

- Defaults alterados por migration: 0 ocorrência(s).

- Triggers (migrations): 0 ocorrência(s).


#### Tabela: `modelos_relatorio`

- Finalidade (inferida pelo uso no código):

  - Usada em frontend/backend para fluxos relacionados a `modelos_relatorio`.

- Colunas (nome: tipo):

  - `ativo`: `boolean`

  - `created_at`: `string`

  - `criado_por`: `string | null`

  - `descricao`: `string | null`

  - `file_name`: `string`

  - `file_path`: `string`

  - `file_size`: `number | null`

  - `file_url`: `string | null`

  - `id`: `string`

  - `nome`: `string`

  - `tipo`: `string`

  - `updated_at`: `string`

- PK: `id` (inferido)

- FKs: nenhuma declarada no type gerado.

- Índices (migrations): 0 ocorrência(s).

- Constraints adicionadas por migration: 0 ocorrência(s).

- Defaults alterados por migration: 0 ocorrência(s).

- Triggers (migrations): 0 ocorrência(s).


#### Tabela: `notification_rules`

- Finalidade (inferida pelo uso no código):

  - Usada em frontend/backend para fluxos relacionados a `notification_rules`.

- Colunas (nome: tipo):

  - `ativo`: `boolean`

  - `created_at`: `string`

  - `id`: `string`

  - `servico_id`: `string`

  - `setor_ids`: `string[] | null`

  - `status_gatilho`: `string`

  - `tipos_notificacao`: `string[]`

  - `updated_at`: `string`

- PK: `id` (inferido)

- FKs:

  - `servico_id` -> `servicos.id` (`notification_rules_servico_id_fkey`)

- Índices (migrations): 0 ocorrência(s).

- Constraints adicionadas por migration: 0 ocorrência(s).

- Defaults alterados por migration: 0 ocorrência(s).

- Triggers (migrations): 0 ocorrência(s).


#### Tabela: `notifications`

- Finalidade (inferida pelo uso no código):

  - Usada em frontend/backend para fluxos relacionados a `notifications`.

- Colunas (nome: tipo):

  - `created_at`: `string`

  - `id`: `string`

  - `lida`: `boolean`

  - `mensagem`: `string`

  - `solicitacao_id`: `string | null`

  - `tipo`: `string`

  - `usuario_id`: `string | null`

- PK: `id` (inferido)

- FKs:

  - `solicitacao_id` -> `solicitacoes.id` (`notifications_solicitacao_id_fkey`)

- Índices (migrations): 1 ocorrência(s).

  - `idx_notifications_usuario` em `(usuario_id)` (20260208173021_da0b55cd-e5aa-4045-b6db-b7365f7e53cc.sql)

- Constraints adicionadas por migration: 0 ocorrência(s).

- Defaults alterados por migration: 0 ocorrência(s).

- Triggers (migrations): 0 ocorrência(s).


#### Tabela: `observacao_historico`

- Finalidade (inferida pelo uso no código):

  - Usada em frontend/backend para fluxos relacionados a `observacao_historico`.

- Colunas (nome: tipo):

  - `autor_id`: `string`

  - `autor_nome`: `string | null`

  - `created_at`: `string`

  - `id`: `string`

  - `observacao`: `string`

  - `solicitacao_id`: `string`

  - `status_no_momento`: `string`

  - `tipo_observacao`: `string`

- PK: `id` (inferido)

- FKs:

  - `solicitacao_id` -> `solicitacoes.id` (`observacao_historico_solicitacao_id_fkey`)

- Índices (migrations): 0 ocorrência(s).

- Constraints adicionadas por migration: 1 ocorrência(s).

  - `observacao_length`: CHECK (length(observacao) <= 10000) (20260211051659_ea7e272f-5b97-4ab1-a9d0-4e814c063bb0.sql)

- Defaults alterados por migration: 0 ocorrência(s).

- Triggers (migrations): 0 ocorrência(s).


#### Tabela: `page_config`

- Finalidade (inferida pelo uso no código):

  - Usada em frontend/backend para fluxos relacionados a `page_config`.

- Colunas (nome: tipo):

  - `config_key`: `string`

  - `config_type`: `string | null`

  - `config_value`: `string | null`

  - `created_at`: `string | null`

  - `description`: `string | null`

  - `id`: `string`

  - `is_active`: `boolean | null`

  - `updated_at`: `string | null`

- PK: `id` (inferido)

- FKs: nenhuma declarada no type gerado.

- Índices (migrations): 0 ocorrência(s).

- Constraints adicionadas por migration: 0 ocorrência(s).

- Defaults alterados por migration: 0 ocorrência(s).

- Triggers (migrations): 0 ocorrência(s).


#### Tabela: `parametros_campos`

- Finalidade (inferida pelo uso no código):

  - Usada em frontend/backend para fluxos relacionados a `parametros_campos`.

- Colunas (nome: tipo):

  - `ativo`: `boolean`

  - `created_at`: `string`

  - `grupo`: `string`

  - `grupo_status`: `string`

  - `id`: `string`

  - `ordem`: `number`

  - `servico_ids`: `string[]`

  - `sigla`: `string | null`

  - `tipo_resultado`: `string | null`

  - `updated_at`: `string`

  - `valor`: `string`

- PK: `id` (inferido)

- FKs: nenhuma declarada no type gerado.

- Índices (migrations): 0 ocorrência(s).

- Constraints adicionadas por migration: 0 ocorrência(s).

- Defaults alterados por migration: 0 ocorrência(s).

- Triggers (migrations): 0 ocorrência(s).


#### Tabela: `pendencia_opcoes`

- Finalidade (inferida pelo uso no código):

  - Usada em frontend/backend para fluxos relacionados a `pendencia_opcoes`.

- Colunas (nome: tipo):

  - `ativo`: `boolean`

  - `created_at`: `string`

  - `id`: `string`

  - `ordem`: `number`

  - `updated_at`: `string`

  - `valor`: `string`

- PK: `id` (inferido)

- FKs: nenhuma declarada no type gerado.

- Índices (migrations): 0 ocorrência(s).

- Constraints adicionadas por migration: 0 ocorrência(s).

- Defaults alterados por migration: 0 ocorrência(s).

- Triggers (migrations): 0 ocorrência(s).


#### Tabela: `pergunta_condicionais`

- Finalidade (inferida pelo uso no código):

  - Usada em frontend/backend para fluxos relacionados a `pergunta_condicionais`.

- Colunas (nome: tipo):

  - `created_at`: `string`

  - `formulario_id`: `string`

  - `id`: `string`

  - `operador`: `string`

  - `pergunta_id`: `string`

  - `pergunta_pai_id`: `string`

  - `valor_gatilho`: `string`

- PK: `id` (inferido)

- FKs:

  - `formulario_id` -> `formularios.id` (`pergunta_condicionais_formulario_id_fkey`)

  - `pergunta_id` -> `banco_perguntas.id` (`pergunta_condicionais_pergunta_id_fkey`)

  - `pergunta_pai_id` -> `banco_perguntas.id` (`pergunta_condicionais_pergunta_pai_id_fkey`)

- Índices (migrations): 2 ocorrência(s).

  - `idx_pergunta_condicionais_form` em `(formulario_id)` (20260214061750_344d3117-24ee-4aa1-bf9c-b38680e7df3b.sql)

  - `idx_pergunta_condicionais_pai` em `(pergunta_pai_id)` (20260214061750_344d3117-24ee-4aa1-bf9c-b38680e7df3b.sql)

- Constraints adicionadas por migration: 0 ocorrência(s).

- Defaults alterados por migration: 0 ocorrência(s).

- Triggers (migrations): 0 ocorrência(s).


#### Tabela: `pergunta_mapeamento`

- Finalidade (inferida pelo uso no código):

  - Usada em frontend/backend para fluxos relacionados a `pergunta_mapeamento`.

- Colunas (nome: tipo):

  - `campo_analise_id`: `string | null`

  - `campo_solicitacao`: `string`

  - `created_at`: `string`

  - `formulario_id`: `string`

  - `id`: `string`

  - `pergunta_id`: `string`

- PK: `id` (inferido)

- FKs:

  - `campo_analise_id` -> `campos_analise.id` (`pergunta_mapeamento_campo_analise_id_fkey`)

  - `formulario_id` -> `formularios.id` (`pergunta_mapeamento_formulario_id_fkey`)

  - `pergunta_id` -> `banco_perguntas.id` (`pergunta_mapeamento_pergunta_id_fkey`)

- Índices (migrations): 1 ocorrência(s).

  - `idx_pergunta_mapeamento_form` em `(formulario_id)` (20260214061750_344d3117-24ee-4aa1-bf9c-b38680e7df3b.sql)

- Constraints adicionadas por migration: 0 ocorrência(s).

- Defaults alterados por migration: 0 ocorrência(s).

- Triggers (migrations): 0 ocorrência(s).


#### Tabela: `profiles`

- Finalidade (inferida pelo uso no código):

  - Usada em frontend/backend para fluxos relacionados a `profiles`.

- Colunas (nome: tipo):

  - `bloqueado`: `boolean`

  - `created_at`: `string`

  - `email`: `string`

  - `email_setor`: `string | null`

  - `id`: `string`

  - `nome`: `string | null`

  - `setor`: `Database["public"]["Enums"]["setor_tipo"] | null`

  - `updated_at`: `string`

- PK: `id` (inferido)

- FKs:

  - `email_setor` -> `setor_emails.email_setor` (`profiles_email_setor_fkey`)

- Índices (migrations): 0 ocorrência(s).

- Constraints adicionadas por migration: 1 ocorrência(s).

  - `email_format`: CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$') (20260211061628_16cd9d0e-d6d6-4b47-b01c-cee3ada0eee1.sql)

- Defaults alterados por migration: 0 ocorrência(s).

- Triggers (migrations): 1 ocorrência(s).

  - `aaa_encrypt_profiles`: BEFORE INSERT OR UPDATE on FOR EACH ROW EXECUTE FUNCTION public.trigger_encrypt_profiles() (20260301032749_ce3cba1d-b8fa-469c-a1d0-9efebae9e351.sql)


#### Tabela: `protocol_config`

- Finalidade (inferida pelo uso no código):

  - Usada em frontend/backend para fluxos relacionados a `protocol_config`.

- Colunas (nome: tipo):

  - `ano_referencia`: `number | null`

  - `created_at`: `string`

  - `id`: `string`

  - `prefixo`: `string`

  - `servico_id`: `string | null`

  - `ultimo_numero`: `number`

  - `updated_at`: `string`

- PK: `id` (inferido)

- FKs:

  - `servico_id` -> `servicos.id` (`protocol_config_servico_id_fkey`)

- Índices (migrations): 0 ocorrência(s).

- Constraints adicionadas por migration: 0 ocorrência(s).

- Defaults alterados por migration: 0 ocorrência(s).

- Triggers (migrations): 0 ocorrência(s).


#### Tabela: `regras_servico`

- Finalidade (inferida pelo uso no código):

  - Usada em frontend/backend para fluxos relacionados a `regras_servico`.

- Colunas (nome: tipo):

  - `agendar_proximo_dia`: `boolean`

  - `aplica_dia_anterior`: `boolean`

  - `ativo`: `boolean`

  - `created_at`: `string`

  - `dias_semana`: `string[]`

  - `hora_corte`: `string`

  - `horarios_por_dia`: `Json | null`

  - `id`: `string`

  - `limite_dia`: `number | null`

  - `limite_qua`: `number | null`

  - `limite_qui`: `number | null`

  - `limite_sab`: `number | null`

  - `limite_seg`: `number | null`

  - `limite_sex`: `number | null`

  - `limite_ter`: `number | null`

  - `recusar_apos_corte`: `boolean`

  - `servico_id`: `string`

  - `updated_at`: `string`

  - `usar_horario_por_dia`: `boolean`

- PK: `id` (inferido)

- FKs:

  - `servico_id` -> `servicos.id` (`regras_servico_servico_id_fkey`)

- Índices (migrations): 0 ocorrência(s).

- Constraints adicionadas por migration: 0 ocorrência(s).

- Defaults alterados por migration: 0 ocorrência(s).

- Triggers (migrations): 0 ocorrência(s).


#### Tabela: `service_routing_rules`

- Finalidade (inferida pelo uso no código):

  - Usada em frontend/backend para fluxos relacionados a `service_routing_rules`.

- Colunas (nome: tipo):

  - `ativo`: `boolean | null`

  - `campo_criterio`: `string`

  - `created_at`: `string | null`

  - `id`: `string`

  - `servico_id`: `string | null`

  - `setor_ids`: `string[]`

  - `updated_at`: `string | null`

  - `valor_criterio`: `string`

- PK: `id` (inferido)

- FKs:

  - `servico_id` -> `servicos.id` (`service_routing_rules_servico_id_fkey`)

- Índices (migrations): 0 ocorrência(s).

- Constraints adicionadas por migration: 0 ocorrência(s).

- Defaults alterados por migration: 0 ocorrência(s).

- Triggers (migrations): 0 ocorrência(s).


#### Tabela: `servicos`

- Finalidade (inferida pelo uso no código):

  - Usada em frontend/backend para fluxos relacionados a `servicos`.

- Colunas (nome: tipo):

  - `anexos_embutidos`: `boolean | null`

  - `aprovacao_administrativo`: `boolean | null`

  - `aprovacao_ativada`: `boolean | null`

  - `aprovacao_operacional`: `boolean | null`

  - `ativo`: `boolean`

  - `codigo_prefixo`: `string`

  - `created_at`: `string`

  - `deferimento_embutidos`: `boolean`

  - `deferimento_pendencias_ativacao`: `string[] | null`

  - `deferimento_status_ativacao`: `string[] | null`

  - `descricao`: `string | null`

  - `id`: `string`

  - `lacre_armador_pendencias_ativacao`: `string[] | null`

  - `lacre_armador_status_ativacao`: `string[] | null`

  - `nome`: `string`

  - `status_confirmacao_lancamento`: `string[] | null`

  - `tipo_agendamento`: `string | null`

  - `updated_at`: `string`

- PK: `id` (inferido)

- FKs: nenhuma declarada no type gerado.

- Índices (migrations): 0 ocorrência(s).

- Constraints adicionadas por migration: 0 ocorrência(s).

- Defaults alterados por migration: 0 ocorrência(s).

- Triggers (migrations): 0 ocorrência(s).


#### Tabela: `setor_emails`

- Finalidade (inferida pelo uso no código):

  - Usada em frontend/backend para fluxos relacionados a `setor_emails`.

- Colunas (nome: tipo):

  - `ativo`: `boolean`

  - `created_at`: `string`

  - `descricao`: `string | null`

  - `email_setor`: `string`

  - `id`: `string`

  - `perfis`: `string[] | null`

  - `setor`: `Database["public"]["Enums"]["setor_tipo"]`

- PK: `id` (inferido)

- FKs: nenhuma declarada no type gerado.

- Índices (migrations): 0 ocorrência(s).

- Constraints adicionadas por migration: 0 ocorrência(s).

- Defaults alterados por migration: 0 ocorrência(s).

- Triggers (migrations): 0 ocorrência(s).


#### Tabela: `setor_servicos`

- Finalidade (inferida pelo uso no código):

  - Usada em frontend/backend para fluxos relacionados a `setor_servicos`.

- Colunas (nome: tipo):

  - `created_at`: `string`

  - `id`: `string`

  - `servico_id`: `string`

  - `setor_email_id`: `string`

- PK: `id` (inferido)

- FKs:

  - `servico_id` -> `servicos.id` (`setor_servicos_servico_id_fkey`)

  - `setor_email_id` -> `setor_emails.id` (`setor_servicos_setor_email_id_fkey`)

- Índices (migrations): 0 ocorrência(s).

- Constraints adicionadas por migration: 0 ocorrência(s).

- Defaults alterados por migration: 0 ocorrência(s).

- Triggers (migrations): 0 ocorrência(s).


#### Tabela: `solicitacoes`

- Finalidade (inferida pelo uso no código):

  - Usada em frontend/backend para fluxos relacionados a `solicitacoes`.

- Colunas (nome: tipo):

  - `armazem_aprovado`: `boolean | null`

  - `armazem_data`: `string | null`

  - `armazem_justificativa`: `string | null`

  - `armazem_usuario_id`: `string | null`

  - `cancelamento_solicitado`: `boolean | null`

  - `cancelamento_solicitado_em`: `string | null`

  - `categoria`: `string | null`

  - `chave_consulta`: `string`

  - `cliente_email`: `string`

  - `cliente_email_hash`: `string | null`

  - `cliente_nome`: `string`

  - `cliente_nome_hash`: `string | null`

  - `cnpj`: `string | null`

  - `cnpj_hash`: `string | null`

  - `comex_aprovado`: `boolean | null`

  - `comex_data`: `string | null`

  - `comex_justificativa`: `string | null`

  - `comex_usuario_id`: `string | null`

  - `created_at`: `string`

  - `custo_posicionamento`: `boolean | null`

  - `data_agendamento`: `string | null`

  - `data_posicionamento`: `string | null`

  - `formulario_id`: `string | null`

  - `id`: `string`

  - `lacre_armador_aceite_custo`: `boolean | null`

  - `lacre_armador_possui`: `boolean | null`

  - `lancamento_confirmado`: `boolean | null`

  - `lancamento_confirmado_data`: `string | null`

  - `lancamento_confirmado_por`: `string | null`

  - `lpco`: `string | null`

  - `numero_conteiner`: `string | null`

  - `observacoes`: `string | null`

  - `pendencias_selecionadas`: `string[] | null`

  - `protocolo`: `string`

  - `solicitar_deferimento`: `boolean | null`

  - `solicitar_lacre_armador`: `boolean | null`

  - `status`: `Database["public"]["Enums"]["status_solicitacao"]`

  - `status_vistoria`: `string | null`

  - `tipo_carga`: `string | null`

  - `tipo_operacao`: `string | null`

  - `updated_at`: `string`

- PK: `id` (inferido)

- FKs:

  - `formulario_id` -> `formularios.id` (`solicitacoes_formulario_id_fkey`)

- Índices (migrations): 6 ocorrência(s).

  - `idx_solicitacoes_protocolo` em `(protocolo)` (20260208173021_da0b55cd-e5aa-4045-b6db-b7365f7e53cc.sql)

  - `idx_solicitacoes_lpco` em `(lpco)` (20260208173021_da0b55cd-e5aa-4045-b6db-b7365f7e53cc.sql)

  - `idx_solicitacoes_conteiner` em `(numero_conteiner)` (20260208173021_da0b55cd-e5aa-4045-b6db-b7365f7e53cc.sql)

  - `idx_solicitacoes_status` em `(status)` (20260208173021_da0b55cd-e5aa-4045-b6db-b7365f7e53cc.sql)

  - `idx_solicitacoes_chave_consulta` em `(chave_consulta)` (20260215185009_e263c04f-1510-4445-b6d9-464ffaa000a6.sql)

  - `idx_solicitacoes_formulario_id` em `(formulario_id)` (20260303012026_97c847eb-ca40-4a41-a6f1-540206da21f5.sql)

- Constraints adicionadas por migration: 2 ocorrência(s).

  - `observacoes_length`: CHECK (length(observacoes) <= 10000),
  ADD CONSTRAINT protocolo_length CHECK (length(protocolo) <= 50),
  ADD CONSTRAINT cliente_nome_length CHECK (length(cliente_nome) <= 255),
  ADD CONSTRAINT cliente_email_length CHECK (length(cliente_email) <= 255) (20260211051659_ea7e272f-5b97-4ab1-a9d0-4e814c063bb0.sql)

  - `cliente_email_format`: CHECK (cliente_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$') (20260211061628_16cd9d0e-d6d6-4b47-b01c-cee3ada0eee1.sql)

- Defaults alterados por migration: 1 ocorrência(s).

  - coluna `chave_consulta` default `upper(substr(md5(random()::text), 1, 6))` (20260215185009_e263c04f-1510-4445-b6d9-464ffaa000a6.sql)

- Triggers (migrations): 2 ocorrência(s).

  - `trigger_update_solicitacao_status`: BEFORE UPDATE on FOR EACH ROW
EXECUTE FUNCTION public.update_solicitacao_status() (20260208173021_da0b55cd-e5aa-4045-b6db-b7365f7e53cc.sql)

  - `aaa_encrypt_solicitacoes`: BEFORE INSERT OR UPDATE on FOR EACH ROW EXECUTE FUNCTION public.trigger_encrypt_solicitacoes() (20260301032749_ce3cba1d-b8fa-469c-a1d0-9efebae9e351.sql)


#### Tabela: `system_config`

- Finalidade (inferida pelo uso no código):

  - Usada em frontend/backend para fluxos relacionados a `system_config`.

- Colunas (nome: tipo):

  - `config_key`: `string`

  - `config_type`: `string`

  - `config_value`: `string | null`

  - `created_at`: `string`

  - `description`: `string | null`

  - `id`: `string`

  - `is_active`: `boolean`

  - `updated_at`: `string`

- PK: `id` (inferido)

- FKs: nenhuma declarada no type gerado.

- Índices (migrations): 0 ocorrência(s).

- Constraints adicionadas por migration: 0 ocorrência(s).

- Defaults alterados por migration: 0 ocorrência(s).

- Triggers (migrations): 0 ocorrência(s).


#### Tabela: `tipos_setor`

- Finalidade (inferida pelo uso no código):

  - Usada em frontend/backend para fluxos relacionados a `tipos_setor`.

- Colunas (nome: tipo):

  - `ativo`: `boolean`

  - `created_at`: `string`

  - `descricao`: `string | null`

  - `id`: `string`

  - `nome`: `string`

  - `pode_aprovar`: `boolean`

  - `pode_editar_processo`: `boolean`

  - `pode_recusar`: `boolean`

  - `pode_visualizar_todos`: `boolean`

  - `updated_at`: `string`

- PK: `id` (inferido)

- FKs: nenhuma declarada no type gerado.

- Índices (migrations): 0 ocorrência(s).

- Constraints adicionadas por migration: 0 ocorrência(s).

- Defaults alterados por migration: 0 ocorrência(s).

- Triggers (migrations): 0 ocorrência(s).


#### Tabela: `user_roles`

- Finalidade (inferida pelo uso no código):

  - Usada em frontend/backend para fluxos relacionados a `user_roles`.

- Colunas (nome: tipo):

  - `created_at`: `string`

  - `id`: `string`

  - `role`: `Database["public"]["Enums"]["app_role"]`

  - `user_id`: `string`

- PK: `id` (inferido)

- FKs: nenhuma declarada no type gerado.

- Índices (migrations): 0 ocorrência(s).

- Constraints adicionadas por migration: 0 ocorrência(s).

- Defaults alterados por migration: 0 ocorrência(s).

- Triggers (migrations): 0 ocorrência(s).


### 1.2 Views e funções SQL

- Views detectadas: `admin_accounts_v`, `profiles_v`, `solicitacoes_v`.

- Funções SQL detectadas: `_get_enc_key`, `create_notifications_for_others`, `decrypt_pii`, `encrypt_pii`, `get_user_email_setor`, `get_user_sector`, `has_role`, `hash_pii`, `insert_audit_log`, `is_gestor`, `is_gestor_for_service`, `setup_admin_role`.

### 1.3 Relacionamentos e diagrama lógico textual

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


Diagrama textual (núcleo):

- `servicos` <- `formularios` <- (`formulario_perguntas`, `formulario_respostas`, `pergunta_condicionais`, `pergunta_mapeamento`)

- `solicitacoes` <- (`audit_log`, `observacao_historico`, `notifications`, `deferimento_documents`, `lacre_armador_dados`, `lancamento_cobranca_registros`, `integration_history`, `campos_analise_valores`)

- `campos_analise` <- (`campos_analise_valores`, `pergunta_mapeamento`)

- `setor_emails` <- (`profiles`, `setor_servicos`) -> `servicos`

### 1.4 Campos fixos vs dinâmicos

- Campos fixos: configuração em `campos_fixos_config`; armazenamento em colunas de `solicitacoes`; consumo em `AnaliseDialog` e `consulta-publica` com filtros de serviço/visibilidade.

- Campos dinâmicos: definição em `campos_analise`; valores em `campos_analise_valores`; mapeáveis via `pergunta_mapeamento` e consumidos na análise/consulta.

- APIs envolvidas: `enviar-formulario`, `consulta-publica`, componentes `FormRenderer`, `AnaliseDialog`, `ProcessoViewDialog`.


## ETAPA 2 — Mapeamento de APIs / Backend (Edge Functions)

### Endpoint lógico: `/admin-change-password`

- Método: `OPTIONS` + requisição principal JSON (normalmente POST via `functions.invoke`).

- Ações internas detectadas: sem chave `action` explícita.

- Tabelas utilizadas: profiles, user_roles.

- RPCs utilizadas: nenhuma.

### Endpoint lógico: `/admin-login`

- Método: `OPTIONS` + requisição principal JSON (normalmente POST via `functions.invoke`).

- Ações internas detectadas: sem chave `action` explícita.

- Tabelas utilizadas: profiles, user_roles.

- RPCs utilizadas: nenhuma.

### Endpoint lógico: `/consulta-publica`

- Método: `OPTIONS` + requisição principal JSON (normalmente POST via `functions.invoke`).

- Ações internas detectadas: sem chave `action` explícita.

- Tabelas utilizadas: campos_analise, campos_analise_valores, campos_fixos_config, consulta_etapas_config, deferimento, deferimento_documents, deferimento_titulos, form-uploads, formulario_perguntas, formulario_respostas, lacre_armador_dados, observacao_historico, parametros_campos, servicos, solicitacoes, system_config.

- RPCs utilizadas: nenhuma.

### Endpoint lógico: `/enviar-email`

- Método: `OPTIONS` + requisição principal JSON (normalmente POST via `functions.invoke`).

- Ações internas detectadas: sem chave `action` explícita.

- Tabelas utilizadas: integracoes, integration_history.

- RPCs utilizadas: nenhuma.

### Endpoint lógico: `/enviar-formulario`

- Método: `OPTIONS` + requisição principal JSON (normalmente POST via `functions.invoke`).

- Ações internas detectadas: save_email.

- Tabelas utilizadas: campos_analise_valores, formulario_respostas, formularios, protocol_config, regras_servico, servicos, solicitacoes.

- RPCs utilizadas: nenhuma.

### Endpoint lógico: `/notificar-status`

- Método: `OPTIONS` + requisição principal JSON (normalmente POST via `functions.invoke`).

- Ações internas detectadas: reenviar_chave.

- Tabelas utilizadas: notification_rules, notifications, parametros_campos, profiles, servicos, setor_emails, solicitacoes_v, user_roles.

- RPCs utilizadas: insert_audit_log.

### Endpoint lógico: `/upload-publico`

- Método: `OPTIONS` + requisição principal JSON (normalmente POST via `functions.invoke`).

- Ações internas detectadas: submit_lacre_form, cancelar_solicitacao, update_lacre_info, aceite_custo_lacre.

- Tabelas utilizadas: deferimento_documents, lacre_armador_dados, notifications, profiles, servicos, setor_emails, setor_servicos, solicitacoes.

- RPCs utilizadas: nenhuma.


## ETAPA 3 — Mapeamento do Frontend (páginas)

### Tela: `src/pages/GestorRegras.tsx`

- APIs chamadas (edge): nenhuma edge direta.

- Tabelas consultadas diretamente: profiles, regras_servico, servicos, setor_emails, setor_servicos, user_roles.

- Estados locais (`useState`) detectados: 10.

- Formulários/eventos de submissão: não evidente.

### Tela: `src/pages/Index.tsx`

- APIs chamadas (edge): consulta-publica.

- Tabelas consultadas diretamente: external_buttons.

- Estados locais (`useState`) detectados: 17.

- Formulários/eventos de submissão: não evidente.

### Tela: `src/pages/InternoDashboard.tsx`

- APIs chamadas (edge): nenhuma edge direta.

- Tabelas consultadas diretamente: deferimento_documents, lancamento_cobranca_config, lancamento_cobranca_registros, notifications, servicos, setor_emails, setor_servicos, solicitacoes.

- Estados locais (`useState`) detectados: 36.

- Formulários/eventos de submissão: não evidente.

### Tela: `src/pages/InternoLogin.tsx`

- APIs chamadas (edge): nenhuma edge direta.

- Tabelas consultadas diretamente: nenhuma consulta direta.

- Estados locais (`useState`) detectados: 1.

- Formulários/eventos de submissão: não evidente.

### Tela: `src/pages/NotFound.tsx`

- APIs chamadas (edge): nenhuma edge direta.

- Tabelas consultadas diretamente: nenhuma consulta direta.

- Estados locais (`useState`) detectados: 0.

- Formulários/eventos de submissão: não evidente.

### Tela: `src/pages/RecuperarSenha.tsx`

- APIs chamadas (edge): nenhuma edge direta.

- Tabelas consultadas diretamente: nenhuma consulta direta.

- Estados locais (`useState`) detectados: 5.

- Formulários/eventos de submissão: sim.

### Tela: `src/pages/Relatorios.tsx`

- APIs chamadas (edge): nenhuma edge direta.

- Tabelas consultadas diretamente: modelo_relatorio_colunas, modelos-relatorio, modelos_relatorio.

- Estados locais (`useState`) detectados: 11.

- Formulários/eventos de submissão: não evidente.

### Tela: `src/pages/admin/AdminFormularios.tsx`

- APIs chamadas (edge): nenhuma edge direta.

- Tabelas consultadas diretamente: estilos_formulario, formulario_campos, formulario_respostas, formularios, servicos.

- Estados locais (`useState`) detectados: 15.

- Formulários/eventos de submissão: não evidente.

### Tela: `src/pages/admin/AdminHistoricoIntegracoes.tsx`

- APIs chamadas (edge): nenhuma edge direta.

- Tabelas consultadas diretamente: integration_history.

- Estados locais (`useState`) detectados: 7.

- Formulários/eventos de submissão: não evidente.

### Tela: `src/pages/admin/AdminIntegracoes.tsx`

- APIs chamadas (edge): nenhuma edge direta.

- Tabelas consultadas diretamente: field_mappings, integracoes.

- Estados locais (`useState`) detectados: 9.

- Formulários/eventos de submissão: não evidente.

### Tela: `src/pages/admin/AdminLogs.tsx`

- APIs chamadas (edge): nenhuma edge direta.

- Tabelas consultadas diretamente: audit_log.

- Estados locais (`useState`) detectados: 6.

- Formulários/eventos de submissão: não evidente.

### Tela: `src/pages/admin/AdminParametros.tsx`

- APIs chamadas (edge): nenhuma edge direta.

- Tabelas consultadas diretamente: field_mappings, notification_rules, page_config, parametros_campos, protocol_config, regras_servico, service_routing_rules, servicos, setor_emails.

- Estados locais (`useState`) detectados: 25.

- Formulários/eventos de submissão: não evidente.

### Tela: `src/pages/admin/AdminParametrosAjuda.tsx`

- APIs chamadas (edge): nenhuma edge direta.

- Tabelas consultadas diretamente: campos_analise, campos_fixos_config, lancamento_cobranca_config, pendencia_opcoes.

- Estados locais (`useState`) detectados: 1.

- Formulários/eventos de submissão: não evidente.

### Tela: `src/pages/admin/AdminServicos.tsx`

- APIs chamadas (edge): nenhuma edge direta.

- Tabelas consultadas diretamente: parametros_campos, servicos, solicitacoes.

- Estados locais (`useState`) detectados: 7.

- Formulários/eventos de submissão: não evidente.

### Tela: `src/pages/admin/AdminSetores.tsx`

- APIs chamadas (edge): nenhuma edge direta.

- Tabelas consultadas diretamente: profiles, servicos, setor_emails, setor_servicos.

- Estados locais (`useState`) detectados: 10.

- Formulários/eventos de submissão: não evidente.

### Tela: `src/pages/admin/AdminUsuarios.tsx`

- APIs chamadas (edge): admin-change-password.

- Tabelas consultadas diretamente: profiles, setor_emails, user_roles.

- Estados locais (`useState`) detectados: 20.

- Formulários/eventos de submissão: não evidente.


## ETAPA 4 — Análise de bindings

### Cadeias de binding identificadas

- Frontend `FormRenderer.values[pergunta_id]` -> backend `enviar-formulario` (`respostas`) -> banco `formulario_respostas.respostas` + mapeamento para `solicitacoes.<campo_solicitacao>` e `campos_analise_valores.valor`.

- Frontend `emailParaNotificacao` -> backend `enviar-formulario` action `save_email` -> banco `solicitacoes.cliente_email`.

- Frontend status/ações de análise -> edge `notificar-status` + RPC `insert_audit_log` -> `notifications` / `audit_log`.

### Campos possivelmente desconectados/legados

- `formulario_campos` ainda lido em `AdminFormularios` para exportação, mas o construtor usa `formulario_perguntas` + `banco_perguntas` (dualidade de modelo).

- `admin_accounts`/`admin_accounts_v` aparecem no schema tipado, mas o login admin operacional usa `profiles` + `user_roles` em `admin-login`.


## ETAPA 5 — Bugs estruturais detectados

### Crítico

- Não identificado bug crítico determinístico apenas por inspeção estática.

### Alto

- Divergência de modelo de formulário (`formulario_campos` vs `formulario_perguntas`), com risco de exportação incompleta de campos novos.

- Uso extensivo de `any` em telas críticas (`InternoDashboard`, `AnaliseDialog`, `ProcessoViewDialog`) aumenta risco de erro em runtime com alterações de schema.

### Médio

- Edge functions não restringem explicitamente método HTTP principal (exceto `OPTIONS`), aceitando fluxo implícito e podendo responder erro genérico para métodos indevidos.

- Dependência de nome de serviço (`solicitacoes.tipo_operacao`) em alguns fluxos pode gerar inconsistência quando nomes mudam.

- Potencial de campos “não aparecerem” por filtro de `servico_ids` + `visivel_*` no frontend (campos novos sem associação de serviço podem ficar fora de telas de análise específicas).

### Baixo

- Componente `NavLink.tsx` sem uso aparente no restante do app.


## ETAPA 6 — Conflitos Frontend ↔ Backend

| Frontend | Backend | Banco | Problema |

|---|---|---|---|

| `AdminFormularios` usa `formulario_campos` para export | Builder e render usam `formulario_perguntas`/`banco_perguntas` | `formulario_campos` + `formulario_perguntas` | Dois modelos concorrentes para o mesmo domínio. |

| Toggle e-mail (`page_config.is_active`) | `FormRenderer` lê `is_active` para exibir campo | `page_config` | Funciona, mas sem validação forte de persistência/erro no toggle (não trata erro de update/insert). |

| `tipo_operacao` em várias telas | Edge functions buscam serviço por nome em alguns fluxos | `servicos.nome` | Acoplamento por nome textual em vez de `servico_id` pode quebrar após renomeações. |


## ETAPA 7 — Problemas específicos solicitados

### 7.1 Botão que desativa e-mail de acompanhamento

- Configuração é salva em `page_config` chave `solicitar_email_acompanhamento` (manager de página externa).

- Leitura no formulário externo usa `page_config.is_active`; valor default é `true` quando chave inexistente.

- Risco identificado: falta tratamento de erro no `onCheckedChange` do toggle (não rollbacka estado se falhar persistência).


### 7.2 Mapeamento de Campos (fixos e dinâmicos)

- Campos fixos na análise são filtrados por `ativo`, `visivel_analise` e `servico_ids` compatível com serviço atual.

- Campos dinâmicos exibidos vêm de `campos_analise_valores` (não da lista completa de configuração), então campos recém-criados sem valor ainda não aparecem na visualização de processo já existente.

- Na consulta pública, filtros adicionais por `visivel_externo` também podem ocultar campos novos.


### 7.3 Erros persistentes no frontend (classe estrutural)

- Uso frequente de `any` + carregamentos paralelos sem validação de schema em runtime pode causar renderizações quebradas com dados nulos inesperados.

- Dependência de objetos opcionais encadeados em telas complexas (análise, consulta) exige hardening adicional de validação.


## ETAPA 8 — Recomendações arquiteturais (priorizadas)

1. Unificar modelo de formulário em `formulario_perguntas`/`banco_perguntas` e remover dependência de `formulario_campos`.

2. Trocar acoplamento por nome de serviço para `servico_id` ponta a ponta (frontend/backend).

3. Endurecer contratos de API: validação de método HTTP, schema de payload e tratamento de erros transacionais.

4. Fortalecer tipagem no frontend (substituir `any` por tipos derivados do schema).

5. Criar teste de integração para toggle de e-mail e visibilidade de campos fixos/dinâmicos por serviço.
