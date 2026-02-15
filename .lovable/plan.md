

## Plano: Fluxo de Cancelamento em Posicionamento com Validação de Custo

### Resumo

Implementar dois cenários de cancelamento para o serviço "Posicionamento":

1. **Cancelamento antes da confirmação** (status atual = `aguardando_confirmacao`): O cancelamento e salvo normalmente. Na timeline, "Cancelado" aparece logo apos "Aguardando Confirmacao".

2. **Cancelamento apos confirmacao** (status atual = `confirmado_aguardando_vistoria`): Requer validacao operacional. Ao selecionar "Cancelado", aparece a pergunta "Ha custo de posicionamento?":
   - **Sim**: Ativa a confirmacao de lancamento financeiro (mesmo fluxo existente do icone $) e salva o cancelamento.
   - **Nao**: Permite salvar o cancelamento diretamente sem lancamento.

### Alteracoes Necessarias

#### 1. Migracao de Banco de Dados
- Adicionar coluna `custo_posicionamento` (boolean, nullable, default null) na tabela `solicitacoes` para registrar a resposta sobre custo.

#### 2. AnaliseDialog.tsx - Validacao ao Cancelar
Quando o usuario selecionar status "cancelado" no serviço de Posicionamento e o status atual ja for `confirmado_aguardando_vistoria`:
- Exibir uma secao condicional com a pergunta "Ha custo de posicionamento?" (Switch ou Radio com Sim/Nao).
- Se **Sim**: ao salvar, gravar `custo_posicionamento = true` e disparar a logica de confirmacao de lancamento (marcando nos campos `status_confirmacao_lancamento` do servico para que o icone $ apareca).
- Se **Nao**: ao salvar, gravar `custo_posicionamento = false` e permitir o cancelamento sem lancamento.
- Se nenhuma opcao for selecionada, bloquear o botao "Salvar Alteracoes" com mensagem de validacao.

#### 3. ProcessStageStepper.tsx - Timeline Visual
O stepper precisa saber em que etapa o cancelamento ocorreu. Para isso:
- Quando `cancelado` e Posicionamento, verificar `custo_posicionamento`:
  - Se o status anterior era `aguardando_confirmacao` (inferido pela ausencia de aprovacoes), mostrar "Cancelado" apos "Aguardando Confirmacao".
  - Se o status anterior era `confirmado_aguardando_vistoria` (inferido pela presenca de aprovacoes ou pelo campo `custo_posicionamento` nao ser null), mostrar a etapa "Confirmado - Aguardando Vistoria/Servico" como completa (vermelha) e depois "Cancelado".

### Detalhes Tecnicos

**Migracao SQL:**
```sql
ALTER TABLE public.solicitacoes 
ADD COLUMN IF NOT EXISTS custo_posicionamento boolean DEFAULT NULL;
```

**AnaliseDialog.tsx - Trecho condicional (pseudocodigo):**
```text
Se selectedStatus === "cancelado" 
  E servicoConfig?.nome inclui "posicionamento"
  E solicitacao.status === "confirmado_aguardando_vistoria":
    Mostrar: "Ha custo de posicionamento?" [Sim] [Nao]
    Se nenhuma opcao: bloquear salvar
    Se Sim: gravar custo_posicionamento=true, lancamento pendente
    Se Nao: gravar custo_posicionamento=false, salvar normalmente
```

**ProcessStageStepper.tsx - Logica de posicionamento do "Cancelado":**
- Adicionar prop `custoposicionamento` (boolean | null).
- Quando `isTerminal` e Posicionamento:
  - Se `custo_posicionamento` nao for null (ou se ha aprovacoes confirmadas): cancelamento ocorreu apos confirmacao -- mostrar a etapa de aguardando vistoria/servico antes do "Cancelado".
  - Caso contrario: cancelamento ocorreu antes da confirmacao -- mostrar "Cancelado" logo apos "Aguardando Confirmacao" (comportamento atual).

**Arquivos modificados:**
- `supabase/migrations/` -- nova migracao
- `src/components/AnaliseDialog.tsx` -- pergunta de custo + validacao
- `src/components/ProcessStageStepper.tsx` -- nova prop e logica de posicionamento do cancelamento
- `supabase/functions/consulta-publica/index.ts` -- incluir `custo_posicionamento` no retorno

