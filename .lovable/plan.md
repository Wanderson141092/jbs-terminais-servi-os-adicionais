
# Plano: Status individual de cada cobranca na coluna $ e badge do servico principal na Analise

## Resumo
Duas alteracoes principais:
1. **AnaliseDialog**: Adicionar um badge de status para "Lanc. Posicionamento" (cobranca do servico principal), semelhante ao que ja existe para "Custo Posic. Lacre".
2. **Dashboard (coluna $)**: Substituir o botao unico por icones de status individuais — um para cada tipo de cobranca aplicavel (servico e pendencia/lacre).

---

## Detalhes Tecnicos

### 1. AnaliseDialog.tsx — Badge do servico principal

Na area de status/cobrancas (proximo ao bloco do Lacre, linhas ~1284-1342), adicionar um badge visual para a cobranca do tipo "servico" quando o status estiver nos `status_ativacao` da config. O badge mostrara:
- Verde com "Confirmado" quando `lancamentoRegistros` tiver registro confirmado
- Vermelho com "Aguardando confirmacao" quando pendente
- Botao "Confirmar Lancamento" embutido quando pendente

Esse badge ficara visivel independentemente do bloco do lacre, sempre que a cobranca de servico estiver ativa para o status atual.

### 2. InternoDashboard.tsx — Coluna $ com icones individuais

Substituir o bloco atual (linhas ~886-907) que mostra um unico botao `<DollarSign>` ou `<Check>` por icones separados para cada cobranca aplicavel:

- Para cada `cobrancaConfig` ativa para aquele processo:
  - Verificar se existe registro em `lancamentoRegistros` para aquela solicitacao + config
  - Se confirmado: icone `<Check>` cinza claro (pequeno)
  - Se pendente: icone `<DollarSign>` vermelho (pequeno)
- Os icones ficam lado a lado na celula, cada um com tooltip indicando o `rotulo_analise` e o status

Logica:
```text
Para cada solicitacao na coluna $:
  1. Encontrar o servico correspondente
  2. Filtrar cobrancaConfigs aplicaveis (por servico_id e status_ativacao)
  3. Para cada config aplicavel:
     - Buscar registro em lancamentoRegistros
     - Renderizar icone individual com tooltip
```

### Arquivos modificados:
- **`src/components/AnaliseDialog.tsx`**: Adicionar badge de status para cobranca tipo "servico" na area de lancamentos
- **`src/pages/InternoDashboard.tsx`**: Refatorar celula da coluna $ para exibir icones individuais por tipo de cobranca

### Comportamento visual esperado na coluna $:
- Processo com apenas cobranca de servico pendente: `[$]` (vermelho)
- Processo com servico confirmado + lacre pendente: `[v][$]` (cinza + vermelho)
- Processo com ambos confirmados: `[v][v]` (cinza + cinza)
- Processo sem cobranca aplicavel: vazio
