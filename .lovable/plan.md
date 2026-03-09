

## Plano: Correção Completa VPERF OMNI FORÇADA

### Estado Atual (Já Implementado)
- Afixos (prefixo/sufixo) já enriquecidos via `affixMap` no `AnaliseDialog`
- Filtro de campos fantasma (`valor !== "—"`) ativo
- `GridAttachmentPreview` integrado na tela de análise
- `useDataIntegrityAlert` hook ativo

### Lacunas Restantes

| Problema | Causa |
|----------|-------|
| Afixos não aplicados em campos sem `formulario_id` | Se a solicitação não tem formulário vinculado, o `affixMap` nunca é construído. Campos dinâmicos preenchidos manualmente (internos) ficam sem sufixo. |
| Afixos não visíveis na consulta externa | A edge function `consulta-publica` retorna valores brutos de `campos_analise_valores` sem consultar `banco_perguntas.config`. |
| Campos fixos com valor criptografado exibem lixo | Campos como `cliente_nome`, `cnpj`, `cliente_email` são criptografados no BD e precisam de `decrypt_pii`. O `toDisplayValue` exibe o valor criptografado. |
| Criação/deleção de campos dinâmicos não reflete em tempo real | As telas internas não escutam mudanças em `campos_analise` — precisam recarregar dados. |
| `consulta-publica` não retorna afixos | O payload de resposta externa não inclui prefixo/sufixo nos campos dinâmicos. |

---

### Implementação

#### 1. Afixos para Campos Dinâmicos Sem Formulário
**Arquivo:** `src/components/AnaliseDialog.tsx`

Quando `formulario_id` é nulo, construir `affixMap` diretamente consultando `pergunta_mapeamento` por `campo_analise_id` (sem filtro de formulário) e `banco_perguntas.config`. Isso garante que campos preenchidos manualmente via tela interna também recebam sufixo/prefixo se configurados.

Alternativa mais simples: consultar `campos_analise` → para cada campo, buscar se existe mapeamento em qualquer formulário ativo com `banco_perguntas.config` que tenha afixos. Isso é um fallback genérico.

#### 2. Afixos na Consulta Externa (Edge Function)
**Arquivo:** `supabase/functions/consulta-publica/index.ts`

No trecho que monta `campos_dinamicos_valores`, adicionar JOIN com `pergunta_mapeamento` e `banco_perguntas` para extrair `config.prefixo`/`config.sufixo` e aplicá-los ao valor antes de retornar no payload JSON.

#### 3. Campos Fixos Criptografados
**Arquivo:** `src/components/AnaliseDialog.tsx`

Os campos `cliente_nome`, `cnpj`, `cliente_email` já chegam descriptografados via view `solicitacoes_v` ou RPC. Verificar se `solicitacao` vem da view ou tabela direta. Se da tabela, usar `decrypt_pii` nos valores relevantes dentro de `resolveCamposExibicao`. (Precisamos confirmar a origem dos dados no dashboard.)

#### 4. Refresh Automático ao Criar/Deletar Campos
**Arquivo:** `src/components/AnaliseDialog.tsx`

Não é necessário realtime aqui — a criação/deleção de campos é ação admin rara. O comportamento correto é que ao reabrir o dialog, os novos campos apareçam (já ocorre). Nenhuma mudança necessária.

**Arquivo:** `src/components/admin/CamposDinamicosManager.tsx` e `CamposFixosManager.tsx`

Já fazem `fetchData()` após save/delete. As telas internas recarregam ao abrir `AnaliseDialog`. O fluxo está correto.

#### 5. Alertas de Integridade Aprimorados
**Arquivo:** `src/hooks/useDataIntegrityAlert.ts`

Expandir validações:
- Detectar campos dinâmicos configurados com sufixo mas cujo valor exibido não contém o sufixo
- Detectar anexos com URLs expiradas (status HTTP check é custoso, manter apenas detecção de URLs vazias/malformadas)

---

### Arquivos Modificados

| Arquivo | Ação |
|---------|------|
| `src/components/AnaliseDialog.tsx` | Construir `affixMap` fallback quando não há `formulario_id` |
| `supabase/functions/consulta-publica/index.ts` | Adicionar afixos aos campos dinâmicos no payload externo |
| `src/hooks/useDataIntegrityAlert.ts` | Expandir detecção de inconsistências |

### Detalhes Técnicos

**Fallback affixMap sem formulário (AnaliseDialog):**
```typescript
// When no formulario_id, query all mappings that reference our dynamic fields
const { data: globalMappings } = await supabase
  .from("pergunta_mapeamento")
  .select("campo_analise_id, banco_perguntas(config)")
  .not("campo_analise_id", "is", null);

for (const m of globalMappings || []) {
  if (m.campo_analise_id && !affixMap.has(m.campo_analise_id)) {
    const cfg = (m as any).banco_perguntas?.config;
    const affixes = resolveMaskAffixes(cfg);
    if (affixes.prefixo || affixes.sufixo) {
      affixMap.set(m.campo_analise_id, affixes);
    }
  }
}
```

**consulta-publica enriquecimento:**
```typescript
// After fetching campos_analise_valores, enrich with affixes
const { data: mappingsForAffixes } = await supabaseAdmin
  .from("pergunta_mapeamento")
  .select("campo_analise_id, banco_perguntas(config)")
  .not("campo_analise_id", "is", null);

const affixMap = new Map();
for (const m of mappingsForAffixes || []) {
  if (m.campo_analise_id && m.banco_perguntas?.config) {
    const cfg = m.banco_perguntas.config;
    const pre = cfg.prefixo || cfg.mascara?.prefixo || "";
    const suf = cfg.sufixo || cfg.mascara?.sufixo || "";
    if (pre || suf) affixMap.set(m.campo_analise_id, { prefixo: pre, sufixo: suf });
  }
}

// Apply when building response
dynamicValues = dynamicValues.map(dv => {
  const aff = affixMap.get(dv.campo_id);
  if (aff && dv.valor) {
    let v = dv.valor;
    if (aff.prefixo && !v.startsWith(aff.prefixo)) v = aff.prefixo + v;
    if (aff.sufixo && !v.endsWith(aff.sufixo)) v = v + " " + aff.sufixo;
    dv.valor = v.trim();
  }
  return dv;
});
```

