

# Corrigir Timeline: Remover Duplicidade de "Recusado" e Mostrar Motivo da Recusa

## Problema Identificado

Para o protocolo JBSS00040 (serviço nao-posicionamento, recusado apos confirmacao):

1. **Duplicidade**: O label "Recusado" aparece duas vezes na timeline:
   - Na etapa "Aguardando Confirmacao", que troca o label para "Recusado" (linha 171)
   - E novamente como etapa terminal separada no bloco nao-posicionamento (linhas 325-331)

2. **Motivo da recusa ausente**: A justificativa ("Indisponibilidade operacional") existe no audit_log mas nao e exibida na timeline. Os campos `armazem_justificativa` e `comex_justificativa` tambem nao sao buscados pela funcao de consulta publica.

## Solucao

### 1. Corrigir duplicidade no `ProcessStageStepper.tsx`

No bloco "Aguardando Confirmacao normal" (linhas 161-184), quando `isTerminal` e `currentOrder > 1`, o label NAO deve ser substituido por "Recusado"/"Cancelado". Deve mostrar "Confirmado" (pois o processo foi confirmado antes de ser recusado). O status terminal so aparecera uma vez, na etapa dedicada.

### 2. Adicionar prop `motivoRecusa` ao componente

Adicionar uma nova prop opcional `motivoRecusa?: string | null` na interface `ProcessStageStepperProps`. Quando o status for terminal (recusado/cancelado), o `detail` da etapa terminal exibira esse motivo.

### 3. Buscar justificativa na funcao `consulta-publica`

Adicionar `armazem_justificativa, comex_justificativa` ao `selectFields` da edge function, e inclui-los no objeto sanitizado retornado.

### 4. Passar a justificativa ao componente em `ConsultaResultado.tsx` e `ProcessoViewDialog.tsx`

Determinar a justificativa mais relevante (priorizar `armazem_justificativa` se `armazem_aprovado === false`, senao `comex_justificativa`) e passar como prop `motivoRecusa`.

---

## Detalhes Tecnicos

### Arquivo: `src/components/ProcessStageStepper.tsx`

**Interface** -- adicionar prop:
```typescript
motivoRecusa?: string | null;
```

**getStages, linhas 169-171** -- corrigir bloco terminal em aguardando_confirmacao:
```typescript
// Antes (duplicava o label):
if (isTerminal) {
  label = terminalLabel;
}

// Depois (mostra "Confirmado" pois ja passou dessa etapa):
if (isTerminal) {
  label = isPosic ? "Posicionamento Confirmado" : "Confirmado";
}
```

**Bloco nao-posicionamento terminal, linhas 323-331** -- adicionar `detail` com motivo:
```typescript
if (isTerminal) {
  stages.push({
    key: status,
    label: terminalLabel,
    icon: <X className="h-4 w-4" />,
    state: "error",
    detail: props.motivoRecusa || undefined,
  });
  return stages;
}
```

Aplicar a mesma logica nos blocos posicionamento (servico e vistoria) para exibir o motivo nos cenarios terminais.

### Arquivo: `supabase/functions/consulta-publica/index.ts`

Adicionar ao `selectFields`:
```
, armazem_justificativa, comex_justificativa
```

### Arquivo: `src/components/ConsultaResultado.tsx`

Determinar o motivo e passar ao stepper:
```tsx
const motivoRecusa = solicitacao.armazem_aprovado === false
  ? (solicitacao as any).armazem_justificativa
  : (solicitacao as any).comex_justificativa;

<ProcessStageStepper
  ...
  motivoRecusa={motivoRecusa}
/>
```

### Arquivo: `src/components/ProcessoViewDialog.tsx`

Mesma logica para passar `motivoRecusa` ao stepper no dialog interno.

