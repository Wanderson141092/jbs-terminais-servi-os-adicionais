
# Correcao: Separar confirmacao de cobranca Lacre e Posicionamento

## Problema
Ao clicar "Confirmar Lancamento" no badge "Custo Posic. Lacre", o sistema abre o dialog generico que chama `handleConfirmarLancamento()` **sem passar o configId** da pendencia. Isso aciona o caminho legado que atualiza apenas o campo global `lancamento_confirmado` da solicitacao, sem criar/atualizar o registro individual na tabela `lancamento_cobranca_registros`. Por isso:
- A confirmacao do lacre nao persiste corretamente
- Confirmar o "Lanc. Posicionamento" marcaria tudo como confirmado via campo global

## Causa Raiz
Linha 1208 do `AnaliseDialog.tsx`: o botao do lacre faz `setShowLancamentoDialog(true)`, abrindo o dialog generico. Esse dialog (linha 1575) chama `handleConfirmarLancamento()` sem argumento, caindo no caminho legado.

## Correcao

### Arquivo: `src/components/AnaliseDialog.tsx`

**1. Substituir o botao do Lacre para confirmar diretamente (linha ~1204-1211)**

Em vez de abrir o dialog generico, o botao "Confirmar Lancamento" do lacre chamara `handleConfirmarLancamento(pendenciaConfig.id)` diretamente, passando o configId correto da pendencia. Isso garante que o upsert vai para o registro individual correto.

Antes:
```
onClick={() => setShowLancamentoDialog(true)
```

Depois:
```
onClick={() => handleConfirmarLancamento(pendenciaConfig?.id)
```

**2. Ajustar o botao de confirmacao na secao de cobrancas do servico (linhas ~1305-1326)**

Os botoes da secao inferior (que ja filtram `tipo !== "pendencia"`) ja passam `cfg.id` corretamente -- nenhuma alteracao necessaria aqui.

**3. Garantir que o dialog generico tambem passe o configId do servico (linha ~1575)**

Alterar o dialog generico para que, caso exista um config de servico, passe o ID:

Antes:
```
onClick={() => handleConfirmarLancamento()
```

Depois:
```
onClick={() => {
  const servicoCfg = cobrancaConfigs.find((c: any) => c.tipo === "servico");
  handleConfirmarLancamento(servicoCfg?.id);
}
```

Isso elimina completamente o caminho legado quando existem configs cadastradas, garantindo que cada tipo de cobranca tenha seu proprio registro independente.

## Resultado Esperado
- Clicar "Confirmar" no badge do Lacre cria/atualiza apenas o registro da pendencia
- Clicar "Confirmar" no Lanc. Posicionamento cria/atualiza apenas o registro do servico
- O campo global `lancamento_confirmado` so muda para `true` quando AMBOS estiverem confirmados
- Os icones no dashboard refletem o estado individual de cada cobranca
