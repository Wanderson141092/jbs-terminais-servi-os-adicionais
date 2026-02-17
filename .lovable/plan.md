
# Correcao: Cores da Timeline usando tipo_resultado

## Problema
Na timeline de progresso, quando o status e "Vistoriado" (tipo_resultado = "conforme"), as etapas anteriores ("Solicitacao Recebida" e "Posicionamento Confirmado") ficam em **azul** (estado "current") ao inves de **verde** (estado "completed").

Isso acontece porque o codigo usa `"current"` como fallback para etapas ja concluidas, independentemente do tipo_resultado do status atual.

## Causa Raiz
No arquivo `src/components/ProcessStageStepper.tsx`, a variavel `completedState` (linha 132) ja calcula corretamente o estado visual baseado no tipo_resultado:
- "conforme" = `"completed"` (verde)
- "nao_conforme" = `"error"` (vermelho)
- "em_pendencia" = `"pending"` (cinza)

Porem, nas linhas onde as etapas anteriores sao construidas, o codigo ignora essa variavel e usa `"current"` (azul) como fallback.

## Correcao

### Arquivo: `src/components/ProcessStageStepper.tsx`

**Linha 144** — Etapa "Solicitacao Recebida":
- De: `state: isTerminal ? "error" : isEmPendencia ? "pending" : "current"`
- Para: `state: isTerminal ? "error" : completedState`

Isso faz com que etapas concluidas usem verde (conforme), cinza (em_pendencia), ou vermelho (nao_conforme).

**Linha 175** — Etapa "Aguardando Confirmacao" (quando ja passou):
- De: `state = isTerminal ? "error" : isEmPendencia ? "pending" : "current";`
- Para: `state = isTerminal ? "error" : completedState;`

Essas sao as unicas duas linhas que precisam ser alteradas. Toda a logica downstream (ramos de Posicionamento, servico, vistoria) ja usa `completedState` corretamente.

## Resultado Esperado
- Status "conforme" (Vistoriado, Servico Concluido): todas as etapas anteriores ficam **verdes**
- Status "em_pendencia" (Vistoriado com Pendencia): etapas anteriores ficam **cinzas**
- Status "nao_conforme" (Cancelado, Recusado, Nao Vistoriado): etapas anteriores ficam **vermelhas**
- Status "neutro" (Aguardando Confirmacao, Aguardando Vistoria): etapa atual fica **azul** (mantido via logica separada)
