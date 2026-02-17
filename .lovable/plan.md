
# Plano: Registros de Lancamento Separados por Tipo de Cobranca

## Problema
Atualmente existe apenas UM campo booleano (`lancamento_confirmado`) na tabela `solicitacoes`. Quando o usuario confirma qualquer lancamento (servico principal ou lacre), esse unico campo muda para `true` e todos os badges mudam para "Confirmado" ao mesmo tempo.

## Solucao
Criar uma tabela auxiliar `lancamento_cobranca_registros` que armazena a confirmacao individual de cada tipo de cobranca por solicitacao.

## Alteracoes

### 1. Nova Tabela: `lancamento_cobranca_registros`

```text
lancamento_cobranca_registros
  - id (uuid, PK)
  - solicitacao_id (uuid, FK -> solicitacoes.id)
  - cobranca_config_id (uuid, FK -> lancamento_cobranca_config.id)
  - confirmado (boolean, default false)
  - confirmado_por (uuid, nullable)
  - confirmado_data (timestamptz, nullable)
  - created_at (timestamptz)
  - updated_at (timestamptz)
  UNIQUE(solicitacao_id, cobranca_config_id)
```

RLS: leitura para todos autenticados, escrita para admins.

### 2. AnaliseDialog.tsx - Confirmacao Individual
- Ao confirmar lancamento do servico principal, inserir/atualizar APENAS o registro com `cobranca_config_id` do tipo "servico"
- Ao confirmar lancamento do lacre, inserir/atualizar APENAS o registro com `cobranca_config_id` do tipo "pendencia"
- Buscar registros da tabela `lancamento_cobranca_registros` ao abrir o dialog
- Os badges de status usarao o registro individual em vez do campo global
- Manter retrocompatibilidade: o campo `lancamento_confirmado` na `solicitacoes` sera marcado como `true` somente quando TODOS os lancamentos aplicaveis estiverem confirmados

### 3. AnaliseDialog.tsx - Badges de Status (linhas ~818-862)
- Para cada `cobranca_config`, verificar o registro individual em `lancamento_cobranca_registros` em vez de `solicitacao.lancamento_confirmado`
- Badge "servico": checar registro onde `cobranca_config_id` = config de servico
- Badge "pendencia": checar registro onde `cobranca_config_id` = config de pendencia/lacre

### 4. AnaliseDialog.tsx - Botao de Confirmacao (linhas ~1196-1230)
- Exibir um botao de confirmacao separado para cada cobranca pendente
- Cada botao confirma apenas seu respectivo registro

### 5. AnaliseDialog.tsx - Salvamento (linhas ~506-527)
- Ao ativar lacre com custo, criar registro pendente para a cobranca de pendencia
- Ao atingir status de conclusao, criar registro pendente para a cobranca de servico
- O campo global `lancamento_confirmado` so sera `true` quando todos os registros estiverem confirmados

### 6. InternoDashboard.tsx - Indicador "$" na Tabela
- Buscar `lancamento_cobranca_registros` junto com solicitacoes
- O "$" vermelho aparece se qualquer registro de cobranca aplicavel nao estiver confirmado
- O check cinza aparece somente quando TODOS os registros estiverem confirmados
- Os contadores de "pendente" e "confirmado" usam a mesma logica

### 7. ProcessChecklist.tsx
- Atualizar o checklist para verificar registros individuais em vez do campo global

## Detalhes Tecnicos

Arquivos modificados:
- **Migration SQL**: criar tabela `lancamento_cobranca_registros` com indice unico e RLS
- **`src/components/AnaliseDialog.tsx`**: fetch dos registros, confirmacao individual, badges individuais, logica de salvamento
- **`src/pages/InternoDashboard.tsx`**: fetch dos registros, logica do "$", contadores
- **`src/components/ProcessChecklist.tsx`**: verificacao individual

Logica de retrocompatibilidade:
- O campo `solicitacoes.lancamento_confirmado` sera mantido e atualizado como "todos confirmados" para nao quebrar filtros e relatorios existentes
- Processos antigos que ja tem `lancamento_confirmado = true` continuarao funcionando normalmente
