

# Plano de Reestruturação Completa do Sistema

Este plano aborda os 24 itens solicitados, organizados em fases de implementação por dependência e prioridade.

---

## Fase 1 — Banco de Dados e Estrutura

### 1.1 Status: Campo "Grupo do Status" e "Sigla" obrigatória
- Adicionar coluna `grupo_status` (text, NOT NULL DEFAULT 'outros_servicos') em `parametros_campos` com valores: `posicionamento_vistoria`, `posicionamento_servico`, `outros_servicos`
- Tornar `sigla` NOT NULL na tabela `parametros_campos` (para grupo `status_processo`)
- Atualizar `ParametrosCamposManager.tsx`: adicionar campo obrigatório "Grupo do Status" (select com 3 opções) e tornar "Sigla" visível e obrigatória para `status_processo`

### 1.2 Observações internas vs externas
- Adicionar coluna `tipo_observacao` (text, DEFAULT 'interna') em `observacao_historico` com valores: `interna`, `externa`
- Atualizar `consulta-publica` Edge Function para filtrar apenas observações `tipo_observacao = 'externa'`

### 1.3 Protocolo por serviço
- Alterar `protocol_config`: adicionar `servico_id` (uuid, nullable FK) para sequências independentes por serviço
- Adicionar coluna `ano_referencia` (integer) para controle de reset anual
- Atualizar `enviar-formulario` Edge Function para gerar protocolo com formato `YY` + prefixo + sequência ampliada

### 1.4 Horário de corte por dia da semana
- Adicionar coluna `horarios_por_dia` (jsonb, nullable) em `regras_servico` — formato: `{"seg":"15:00","ter":"16:00",...}`
- Adicionar coluna `usar_horario_por_dia` (boolean, DEFAULT false) em `regras_servico`

---

## Fase 2 — Backend / Edge Functions

### 2.1 Correção "Aplica Dia Anterior" (item 20)
- Corrigir lógica em `enviar-formulario`: quando ativado, comparar horário da solicitação com horário de corte E verificar se data informada é D+1 ou anterior. Quando desativado, aplicar corte apenas pelo horário do pedido. Em ambos os casos, seguir o "Comportamento após o Corte" configurado.

### 2.2 Consulta pública — observações externas
- Alterar filtro em `consulta-publica` para retornar apenas `tipo_observacao = 'externa'` (substituindo o filtro atual de `[Correção de Status]`)

### 2.3 Recusa com motivo na página externa
- Na resposta de `consulta-publica`, incluir `motivo_recusa` da última observação externa quando status = `recusado`

---

## Fase 3 — Frontend: Parâmetros e Admin

### 3.1 Nome descriptografado no header (item 3)
- O `fetchProfile` já usa `profiles_v` (view descriptografada). Verificar se o `trigger_encrypt_profiles` está re-encriptando em UPDATE desnecessariamente. O problema provavelmente é que o nome salvo no perfil já estava criptografado antes da migração de views. Corrigir: garantir que `profiles_v` retorna `decrypt_pii(nome)` corretamente.

### 3.2 ParametrosCamposManager — grupo do status e sigla
- Para `status_processo`: adicionar Select "Grupo do Status" (obrigatório, 3 opções)
- Tornar campo "Sigla" visível e obrigatório (já existe `showSigla` mas está `false` para `status_processo`)
- Atualizar constante `GRUPOS` para `status_processo`: `showSigla: true`

### 3.3 Desfazer lançamento de cobrança (item 6)
- Em `AnaliseDialog.tsx`: adicionar botão "Desfazer" ao lado de cada lançamento confirmado
- Lógica: `UPDATE lancamento_cobranca_registros SET confirmado = false, confirmado_por = null, confirmado_data = null`
- Registrar em audit_log

### 3.4 Toggle deferimento/lacre armador (item 7)
- Corrigir lógica em `AnaliseDialog.tsx`: toggle só aparece se serviço do processo = serviço da config E status atual está na lista de ativação. Se pendência marcada no checkbox, mostrar toggle imediatamente (antes de salvar). Se pendência em branco, ocultar.

### 3.5 Observações internas vs externas (item 8)
- Adicionar toggle "Interna / Externa (Cliente)" na seção de observações do `AnaliseDialog.tsx`
- Gravar `tipo_observacao` na inserção de `observacao_historico`

### 3.6 Correção de status — reset total (item 5)
- Em `StatusCorrectionDialog.tsx`: ao corrigir, além de mudar o status, limpar: `pendencias_selecionadas = []`, `status_vistoria = null`, `solicitar_deferimento = false`, `solicitar_lacre_armador = false`, `lancamento_confirmado = null`, `custo_posicionamento = null`

### 3.7 Recusa obrigatória com motivo (item 4)
- Em `AnaliseDialog.tsx` e `executeRecusa`: já exige justificativa. Garantir que o motivo é gravado em `observacao_historico` com `tipo_observacao = 'externa'` para aparecer na consulta pública quando status = recusado.

### 3.8 Logs descriptografados + "Ver detalhes" (item 9)
- Em `AdminLogs.tsx`: já usa `profiles` para nomes. Adicionar botão "Ver detalhes" por linha que abre modal mostrando todos os campos do log formatados.

### 3.9 Notificações — Administrador (item 21)
- Em `AdminParametros.tsx`, seção Notificações: adicionar opção "Administrador do Sistema" no select de setores destinatários
- Em `notificar-status` Edge Function: quando setor = `admin`, enviar para todos usuários com role `admin`

### 3.10 Manual auto-atualizável (item 11)
- Em `AdminParametrosAjuda.tsx`: substituir schema estático por consulta dinâmica que varre tabelas de configuração
- Adicionar botão "Atualizar Manual" que recarrega os dados
- Corrigir botão "Voltar" para `/interno/admin/parametros`

---

## Fase 4 — Frontend: Dashboard e Ações em Lote

### 4.1 Ações em lote (item 10)
- Adicionar opções no menu de ações em lote: "Lançamento de cobrança em lote" e "Lacre armador em lote"
- Criar `BatchBillingDialog.tsx` para confirmação de múltiplos lançamentos

### 4.2 Relatórios personalizados (item 12)
- Em `ExtrairRelatorioDialog.tsx`: adicionar filtros "Apenas com Deferimento" e "Apenas Lançamentos de Cobrança"

### 4.3 Navis N4 — filtros (item 13)
- Em `NavisN4ExportDialog.tsx`: adicionar dropdowns de Serviço e Status (ambos com padrão "Todos")

---

## Fase 5 — Frontend: Formulários

### 5.1 Sub-perguntas condicionais completas (item 14)
- Em `FormFieldRenderer.tsx`: ao renderizar sub-pergunta condicional, aplicar mesmas configurações (máscara, validação, opções) da pergunta principal

### 5.2 Bloqueio de autoreferência (item 15)
- Em `FormularioBuilder.tsx`: filtrar a pergunta atual da lista de opções de "pergunta pai" no dropdown de condicionais

### 5.3 Descrição/subtítulo em perguntas (item 16)
- Adicionar coluna `descricao` (text, nullable) em `banco_perguntas` (se não existir)
- Renderizar abaixo do rótulo com suporte a itálico e tamanho de fonte configurável

---

## Fase 6 — Frontend: Serviços e Página Externa

### 6.1 Prefixo de serviço (item 17)
- Em `AdminServicos.tsx`: validar prefixo como 1 letra + 0-2 números (até 3 chars)
- Em `enviar-formulario`: usar apenas o 1° caractere (letra) no protocolo

### 6.2 Lacre armador — página externa (item 18)
- Em `ConsultaResultado.tsx`: mostrar campos somente se toggle ativo. Adicionar toggle "Lacre Coletado". Aplicar regra: "Há cobrança?" = Sim → "Custo de Serviço" = Sim. Exibir tipo de aceite no campo "Ciente do custo de novo posicionamento".

### 6.3 UI — botões externos menores (item 23)
- Em `Index.tsx`: reduzir tamanho dos cards de botão em 50%. Adicionar `max-h-[400px] overflow-y-auto` na área de botões a partir de 4 botões.

### 6.4 Login/Logoff/Redirecionamento (item 24)
- Logoff: já redireciona para `/servicos-adicionais` (correto)
- Em `InternoLogin.tsx`: se não logado, redirecionar para `/` (página externa) em vez de mostrar o formulário de login vazio. Manter overlay de login acessível.
- Rota `/interno`: redirecionar para `/interno/dashboard` se logado

### 6.5 Protocolo por serviço — UI (item 22)
- Em `AdminParametros.tsx`, seção Protocolo: mostrar tabela com quantidade e última numeração por serviço. Exibir formato com 2 dígitos do ano.

---

## Fase 7 — Horário de corte por dia (item 19)

- Em `GestorRegras.tsx` e `AdminParametros.tsx`: adicionar toggle "Horário por dia da semana". Ao ativar, exibir inputs de hora para cada dia selecionado.
- Em `enviar-formulario`: ler `horarios_por_dia` se `usar_horario_por_dia = true`, obter hora de corte do dia correspondente.

---

## Resumo de Alterações por Camada

**Migrações SQL**: 1 migração com ~6 alterações de schema  
**Edge Functions**: `enviar-formulario`, `consulta-publica`, `notificar-status`  
**Componentes principais**: ~15 arquivos React modificados  
**Novos componentes**: `BatchBillingDialog.tsx`  

A implementação será feita em sequência de fases, garantindo que cada fase esteja funcional antes de avançar.

