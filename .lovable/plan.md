

## Plano: Correção Definitiva de Anexos, Sufixos e Campos Dinâmicos

### Diagnóstico Confirmado

| Problema | Causa Raiz |
|----------|------------|
| **Sufixo "ºC" não exibido em Temperatura Doca** | O campo dinâmico é exibido via `toDisplayValue` que ignora `prefixo`/`sufixo`. O mapeamento BD já possui `config.sufixo = "ºC"`, mas `campos_analise_valores` armazena apenas o valor bruto (`-1`), e a lógica de exibição não consulta a config da pergunta original. |
| **Campos fantasma em "Campos do Processo"** | `resolveCamposExibicao` inclui campos dinâmicos com valor `"—"` (nulo). O usuário quer ver **somente campos com valor real**. |
| **Anexos Solicitação não aparecem / layout errado** | Anexos existem em `formArquivos` e são exibidos via `InlineAttachmentPreview` (sidebar). O usuário quer **grade horizontal com quebra de linha + preview abaixo**. |

---

### Implementação

#### 1. Aplicar Sufixo/Prefixo em Campos Dinâmicos
**Arquivo:** `src/components/AnaliseDialog.tsx`

- Na consulta de `campos_analise_valores`, fazer JOIN com `pergunta_mapeamento` e `banco_perguntas` para obter `config.prefixo` / `config.sufixo`.
- Criar novo tipo `CampoAnaliseValorComConfig` que inclui `prefixo`, `sufixo`.
- Modificar `resolveCamposExibicao` para aplicar afixos via `applyAffixSafely` nos valores dinâmicos.

#### 2. Filtrar Campos Sem Valor Real
**Arquivo:** `src/components/AnaliseDialog.tsx`

- Em `resolveCamposExibicao`, após montar `fixos` e `dinamicos`, filtrar por `valor !== "—"` antes de retornar.

#### 3. Novo Layout de Anexos: Grade + Preview Abaixo
**Arquivo:** `src/components/GridAttachmentPreview.tsx` (novo)

- Criar componente que exibe anexos em **grade horizontal com flex-wrap**.
- Ao clicar em um anexo, abre **preview abaixo** (dentro do mesmo bloco, não modal).
- Manter botões "Abrir" e "Baixar".

**Arquivo:** `src/components/AnaliseDialog.tsx`

- Substituir `InlineAttachmentPreview` por `GridAttachmentPreview` na seção de anexos.

#### 4. Auditoria e Alertas Inteligentes
**Arquivo:** `src/hooks/useDataIntegrityAlert.ts` (novo)

- Hook que valida integridade de campos e anexos no carregamento.
- Se detectar inconsistência (ex: campo mapeado sem valor, anexo com URL inválida), dispara toast de alerta.
- Registra via `insert_audit_log` para auditoria.

**Arquivo:** `src/components/AnaliseDialog.tsx`

- Invocar `useDataIntegrityAlert` no `fetchData`.

---

### Arquivos Modificados/Criados

| Arquivo | Ação |
|---------|------|
| `src/components/AnaliseDialog.tsx` | Modificar JOIN de `campos_analise_valores`, filtrar vazios, trocar componente de anexos |
| `src/components/GridAttachmentPreview.tsx` | **Criar** — grade horizontal + preview abaixo |
| `src/hooks/useDataIntegrityAlert.ts` | **Criar** — hook de auditoria/alertas |
| `src/components/InlineAttachmentPreview.tsx` | Manter para uso em deferimento (sidebar continua válida lá) |

---

### Detalhes Técnicos

**Query atualizada para campos dinâmicos com config:**
```sql
SELECT cav.campo_id, cav.valor, ca.nome, ca.ordem,
       bp.config->>'prefixo' as prefixo, bp.config->>'sufixo' as sufixo
FROM campos_analise_valores cav
JOIN campos_analise ca ON ca.id = cav.campo_id
LEFT JOIN pergunta_mapeamento pm ON pm.campo_analise_id = cav.campo_id
LEFT JOIN banco_perguntas bp ON bp.id = pm.pergunta_id
WHERE cav.solicitacao_id = $1 AND ca.ativo = true
```

**GridAttachmentPreview — estrutura:**
```text
┌─────────────────────────────────────────────────────┐
│ Anexos da Solicitação (3)              [Expandir]  │
├─────────────────────────────────────────────────────┤
│ ┌──────┐ ┌──────┐ ┌──────┐                         │
│ │ PDF  │ │ IMG  │ │ PDF  │  ← clicável, flex-wrap  │
│ └──────┘ └──────┘ └──────┘                         │
├─────────────────────────────────────────────────────┤
│ Preview do arquivo selecionado (iframe/img)        │
│ [Abrir em nova aba] [Baixar]                       │
└─────────────────────────────────────────────────────┘
```

