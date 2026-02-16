
# Plano: Correções no Sistema de Cobranças

## Problemas Identificados

1. **Badges de cobranca na analise estao com logica invertida/incorreta** -- o badge "Custo Posic. Lacre" deveria mostrar o status "Lanc. Posic. Lacre Pendente" como referencia, e "Lanc. Posicionamento" deveria usar "Aguardando confirmacao de lancamento do servico".
2. **"Custo Posic. Lacre" deve ficar oculto** se a resposta a "Ha cobranca..." for "Nao".
3. **Texto da pergunta** precisa mudar de "Ha cobranca de servico (lacre armador)?" para "Ha cobranca de novo servico (Posicionamento — Pendencia de Lacre armador)?".
4. **Falta campo `status_ativacao`** na tabela `lancamento_cobranca_config` e no formulario de gestao (LancamentoCobrancaManager) para configurar quais status ativam a visibilidade de cada cobranca.

## Alteracoes Planejadas

### 1. Migracao de Banco de Dados
Adicionar coluna `status_ativacao text[] NOT NULL DEFAULT '{}'::text[]` a tabela `lancamento_cobranca_config` para armazenar os status que ativam a visibilidade de cada cobranca na tela de analise.

### 2. LancamentoCobrancaManager (Parametros > Pag. Interna)
- Adicionar campo "Status de Ativacao" no formulario de Nova/Editar Cobranca -- lista de checkboxes com os status do sistema (vindos de `parametros_campos` grupo `status_processo`).
- Adicionar coluna "Status Ativacao" na tabela de listagem.
- Salvar/carregar o novo campo `status_ativacao`.

### 3. AnaliseDialog -- Badges de Cobranca (linhas ~818-856)
Reescrever a logica dos badges dinamicos:

- **Tipo "servico" (ex: Lanc. Posicionamento):**
  - Visibilidade controlada por `cfg.status_ativacao` (se configurado, so aparece quando `solicitacao.status` esta na lista).
  - Campo de referencia: `solicitacao.lancamento_confirmado` -- exibe "Pendente" ou "Confirmado".
  - Texto: `{cfg.rotulo_analise}: Aguardando confirmacao de lancamento do servico` quando pendente / `Confirmado` quando confirmado.

- **Tipo "pendencia" (ex: Custo Posic. Lacre):**
  - Visibilidade: so aparece se `solicitacao.lacre_armador_aceite_custo === true` (se "Nao", fica oculto).
  - Visibilidade tambem controlada por `cfg.status_ativacao`.
  - Texto: `{cfg.rotulo_analise}: Lanc. Posic. Lacre Pendente` quando lancamento pendente / `Confirmado` apos confirmar.

### 4. AnaliseDialog -- Texto da Pergunta (linha ~1128)
Alterar de:
> "Ha cobranca de servico (lacre armador)?"

Para:
> "Ha cobranca de novo servico (Posicionamento — Pendencia de Lacre armador)?"

### 5. Secao "Aguardando confirmacao de lancamento" (linhas ~1190-1211)
Conectar esta secao tambem as `cobrancaConfigs` de tipo "servico" para usar o rotulo correto e respeitar o `status_ativacao`.

## Detalhes Tecnicos

```text
lancamento_cobranca_config
+-------------------+----------+
| Campo Novo        | Tipo     |
+-------------------+----------+
| status_ativacao   | text[]   |
+-------------------+----------+
```

Fluxo de visibilidade dos badges:
```text
Para cada cfg em cobrancaConfigs:
  1. Se cfg.status_ativacao nao vazio -> so mostra se solicitacao.status esta na lista
  2. Se cfg.tipo == "servico" -> mostra badge com lancamento_confirmado
  3. Se cfg.tipo == "pendencia" -> so mostra se lacre_armador_aceite_custo === true
     (oculto se "Nao" ou null)
```

### Arquivos Modificados
- **Migracao SQL**: Nova coluna `status_ativacao`
- **`src/components/admin/LancamentoCobrancaManager.tsx`**: Campo de status de ativacao
- **`src/components/AnaliseDialog.tsx`**: Logica de badges, texto da pergunta, secao de lancamento
