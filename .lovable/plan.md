

# Analise Completa de Erros e Correções

## Erros Identificados

### 1. CRITICO - Tipo Carga: `formatTipoCarga` usa mapeamento estatico desatualizado

**Problema:** O arquivo `src/lib/tipoCarga.ts` usa um mapeamento hardcoded (`TIPO_CARGA_SIGLAS`) para converter nomes de carga em siglas. No banco de dados, os valores de `tipo_carga` ja foram atualizados (ex: "Dry", "Reefer", "IMDG"), mas o mapeamento estatico ainda referencia valores antigos como "Carga geral" -> "Dry". Alem disso, o campo `sigla` no banco esta `null` para "Dry" e "Reefer" (porque o valor JA e a sigla), mas para "IMDG" a sigla e "IMO" e para "Carga Excesso de dimensoes" a sigla e "OOG".

**Correção:** Refatorar `formatTipoCarga` para buscar dinamicamente da tabela `parametros_campos` (grupo `tipo_carga`). Se o item tem `sigla`, mostrar a sigla; senao, mostrar o `valor` diretamente. Manter fallback estatico para funcionar offline.

---

### 2. CRITICO - Formularios: Estilo NAO persiste no banco de dados

**Problema confirmado:** Todos os 5 formularios no banco tem `estilo: 'jbs'`, mesmo tendo sido criados com nomes como "Formulário Google Forms", "Formulário Hashdata", etc. Isso significa que a selecao de estilo ao criar/editar nao esta sendo salva corretamente OU os formularios foram criados antes da coluna `estilo` existir.

**Correção:**
- Verificar que o `saveForm` inclui `estilo: formData.estilo` no insert/update (ja parece incluir no codigo atual)
- O problema real e que os formularios existentes foram criados ANTES da migracao adicionar a coluna `estilo`, recebendo o default `'jbs'`
- Atualizar os formularios existentes com os estilos corretos via SQL
- Adicionar coluna "Estilo" na tabela de listagem para visualizacao

---

### 3. CRITICO - Deferimento: Botao na pagina interna usa logica errada

**Problema:** No dashboard interno (linha 690-706), o botao de deferimento verifica `statusLanc.includes(s.status)` usando `status_confirmacao_lancamento`. Isso e ERRADO - `status_confirmacao_lancamento` controla quando mostrar lancamento financeiro, NAO o deferimento. A condicao correta para deferimento e: status === "vistoria_finalizada" + servico Posicionamento + categoria Exportacao.

**Correção:** Separar a logica do botao de deferimento da logica de lancamento. O deferimento deve aparecer quando:
- `s.status === "vistoria_finalizada"`
- `s.tipo_operacao` contem "Posicionamento"
- `s.categoria === "Exportação"`

---

### 4. CRITICO - Consulta externa: `onRefresh` passa `tipo_operacao` em vez de `servicoId`

**Problema:** Em `Index.tsx` (linha 211), o `onRefresh` chama `handleSearch(resultado.tipo_operacao, resultado.protocolo)`. Mas `handleSearch` espera um `servicoId` (UUID), nao o nome do servico. Isso faz com que a consulta falhe ao tentar atualizar apos envio de deferimento.

**Correção:** Guardar o `servicoId` usado na busca original e usar na chamada de refresh, ou buscar o servico pelo nome dentro do refresh.

---

### 5. IMPORTANTE - Anexos de analise nao aparecem

**Problema:** Na `AnaliseDialog.tsx`, a query busca documentos com `.neq("document_type", "deferimento")`. Porem, no banco de dados, o unico `document_type` existente e `"deferimento"`. Nao existem registros com `document_type` diferente (como "analise" ou "anexo"). Isso significa que nao ha como enviar anexos de analise atualmente - a funcionalidade de upload de anexos de analise nao esta implementada.

**Correção:** Implementar um mecanismo de upload de anexos de analise na pagina externa ou interna, com `document_type = 'analise'`, para que eles aparecam na tela de analise.

---

### 6. IMPORTANTE - ParametrosCamposManager: Falta grupo `status_processo` com flags de servico

**Problema:** O `GRUPOS` no `ParametrosCamposManager` nao inclui `status_processo`. A coluna `servico_ids` existe na tabela mas nao ha UI para gerencia-la. Os status do processo (aguardando_confirmacao, vistoria_finalizada, etc.) estao hardcoded no `StatusBadge` e no `AnaliseDialog`.

**Correção:**
- Adicionar grupo `status_processo` no `GRUPOS` do `ParametrosCamposManager`
- Adicionar UI para selecionar quais servicos cada status pertence (multi-select de servicos)
- Usar esses dados para filtrar as opcoes de status no `AnaliseDialog`

---

### 7. MEDIO - Dashboard: Filtro "Todos + Todos" exclui `vistoria_finalizada` mas deveria nao mostrar nada

**Problema:** Quando ambos os filtros sao "Todos", a query exclui apenas `vistoria_finalizada` mas ainda mostra todos os outros processos. A regra diz que deveria nao trazer nada nesse cenario, mas na pratica mostra aguardando, recusados, etc.

**Correção:** Quando servico=Todos E lancamento=Todos, nao carregar dados (query vazia ou mostrar mensagem para selecionar um filtro).

---

### 8. MEDIO - Formulario `estilo` nao exibido na listagem

**Problema:** A tabela de formularios em `AdminFormularios.tsx` mostra Titulo, Descricao, Status e Acoes, mas nao mostra qual estilo esta selecionado. Isso dificulta saber qual estilo cada formulario usa.

**Correção:** Adicionar coluna "Estilo" na tabela e buscar o campo `estilo` no select da query.

---

### 9. MENOR - Interface `Formulario` nao tem campo `estilo`

**Problema:** A interface `Formulario` em `AdminFormularios.tsx` (linha 56-62) nao tem o campo `estilo`. O codigo usa `(form as any).estilo` como workaround. Isso pode causar erros de tipagem.

**Correção:** Adicionar `estilo?: string` na interface `Formulario`.

---

### 10. MENOR - Deferimento: `deferimento_documents` nao permite UPDATE via RLS

**Problema:** A tabela `deferimento_documents` nao tem politica de UPDATE. Quando o admin tenta aceitar/recusar um deferimento, o update falha silenciosamente ou da erro.

**Correção:** Adicionar politica RLS de UPDATE para admins na tabela `deferimento_documents`.

---

## Plano de Implementacao

### Fase 1: Correcoes Criticas (banco + codigo)

1. **Migracao SQL:**
   - Adicionar politica RLS de UPDATE em `deferimento_documents` para admins
   - Atualizar estilos dos formularios existentes com os valores corretos

2. **`src/lib/tipoCarga.ts`:**
   - Refatorar para buscar siglas dinamicamente da tabela `parametros_campos`
   - Manter cache local e fallback estatico

3. **`src/pages/InternoDashboard.tsx`:**
   - Corrigir logica do botao de deferimento (usar status direto em vez de `status_confirmacao_lancamento`)
   - Corrigir filtro "Todos + Todos" para nao carregar dados

4. **`src/pages/Index.tsx`:**
   - Corrigir `onRefresh` para passar `servicoId` correto em vez de `tipo_operacao`

### Fase 2: Melhorias de Funcionalidade

5. **`src/components/ParametrosCamposManager.tsx`:**
   - Adicionar grupo `status_processo` com suporte a `servico_ids`
   - Adicionar multi-select de servicos no dialog de edicao

6. **`src/pages/admin/AdminFormularios.tsx`:**
   - Corrigir interface `Formulario` para incluir `estilo`
   - Adicionar coluna "Estilo" na tabela de listagem

7. **`src/components/AnaliseDialog.tsx`:**
   - Corrigir refresh de documentos de deferimento apos aceitar/recusar (atualmente recarrega TODOS incluindo analise)

### Fase 3: Funcionalidade Faltante

8. **Upload de Anexos de Analise:**
   - A funcionalidade de enviar anexos de analise nao existe. Os documentos de analise precisam de um fluxo de upload separado (na criacao da solicitacao ou na pagina externa)
   - Isso requer discussao sobre onde o upload deve acontecer

---

## Resumo dos Arquivos Afetados

| Arquivo | Alteracoes |
|---------|------------|
| `src/lib/tipoCarga.ts` | Refatorar para busca dinamica |
| `src/pages/InternoDashboard.tsx` | Corrigir botao deferimento + filtros |
| `src/pages/Index.tsx` | Corrigir onRefresh servicoId |
| `src/components/ParametrosCamposManager.tsx` | Adicionar status_processo + servico_ids UI |
| `src/pages/admin/AdminFormularios.tsx` | Interface + coluna estilo |
| `src/components/AnaliseDialog.tsx` | Corrigir refresh deferimento docs |
| Migracao SQL | RLS update deferimento_documents + fix estilos |

