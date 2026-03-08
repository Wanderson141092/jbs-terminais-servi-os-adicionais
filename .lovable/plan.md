

## Plano: Correção de Anexos, Prefixos/Sufixos e URLs de Deferimento

### Problemas Identificados

1. **Deferimento sem URL assinada**: Os documentos de deferimento (`deferimento_documents.file_url`) contêm `storage_path` ou URLs expiradas do bucket privado `deferimento`, mas são passados diretamente ao `InlineAttachmentPreview` sem gerar URLs assinadas. Resultado: preview falha silenciosamente.

2. **Prefixo/Sufixo já funciona**: A função `formatFormValue` (linha 2038) já lê `config.prefixo` e `config.sufixo` do `banco_perguntas` e os aplica via `normalizeFormValue`. O fluxo está correto para respostas novas e antigas, desde que o `config` esteja salvo no `banco_perguntas`. Nenhuma correção necessária aqui.

3. **Campos fixos/dinâmicos já são dinâmicos**: `resolveCamposExibicao` filtra por `servico_id` e `visivel_analise`/`visivel_externo` em tempo real. Criar ou deletar um campo no admin já reflete automaticamente na análise e na consulta pública. Nenhuma correção necessária.

---

### Implementação

#### 1. Assinar URLs de documentos de deferimento
**Arquivo:** `src/components/AnaliseDialog.tsx`

No `useEffect` de `fetchData`, após buscar `deferimento_documents` (linha 295), adicionar lógica de `createSignedUrl` para o bucket `deferimento` — idêntica à já usada para `form-uploads`. Extrair `storage_path` da URL ou usar diretamente se não for HTTP, gerar URL assinada de 1h, e marcar com `error: true` se falhar.

Atualizar a seção de renderização (linhas 1542-1552) para usar os dados já assinados em vez de `att.file_url` direto.

#### 2. Separar estado de deferimento com URLs assinadas
Adicionar um novo estado `deferimentoArquivos` (mesmo formato de `formArquivos`) para armazenar os documentos de deferimento com URLs assinadas, em vez de usar `attachments` diretamente.

---

### Arquivos Modificados

| Arquivo | Ação |
|---|---|
| `src/components/AnaliseDialog.tsx` | Adicionar assinatura de URLs para deferimento + novo estado `deferimentoArquivos` |

### Escopo Reduzido
- Prefixo/sufixo: já funciona corretamente, sem alteração necessária.
- Campos fixos/dinâmicos: já são dinâmicos, sem alteração necessária.
- Foco exclusivo: corrigir URLs de deferimento que não carregam no preview.

