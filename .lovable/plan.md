

## Plano: Reestruturação da Exibição de Anexos na Tela de Análise

### Diagnóstico da Auditoria

**Fluxo atual de anexos do formulário:**
1. Upload via `upload-publico` → salva em bucket `form-uploads` → retorna `storage_path` (relativo)
2. `enviar-formulario` grava `storage_path` no campo `arquivos` de `formulario_respostas` (JSONB)
3. `AnaliseDialog` busca `formulario_respostas.arquivos`, gera URLs assinadas via `createSignedUrl`
4. Exibição: badges clicáveis que abrem o `AttachmentViewer` (modal com sidebar + preview)

**Fluxo de anexos de deferimento:**
1. Upload via `upload-publico` → bucket `deferimento` → insere em `deferimento_documents`
2. `AnaliseDialog` busca `deferimento_documents` com `neq("document_type", "deferimento")` para anexos gerais, e filtra por `"deferimento"` para docs de deferimento
3. Exibição: lista inline com botões Visualizar/Download ou embarcado

**Problemas identificados:**
- Anexos do formulário aparecem como badges pequenos, sem preview direto na tela (só via modal)
- Não há separação visual clara entre anexos do formulário e anexos de deferimento
- Anexos de deferimento (`attachments`) usam URLs que podem ser `storage_path` sem assinatura
- O `AttachmentViewer` já tem a UI ideal (sidebar esquerda + preview direita), mas só é usado em modal

---

### Plano de Implementação

#### 1. Reestruturar seção de anexos do formulário na AnaliseDialog
**Arquivo:** `src/components/AnaliseDialog.tsx` (linhas ~1173-1200)

Substituir a seção atual de badges por um componente inline com:
- Layout de duas colunas dentro de um container `border rounded-lg`
- **Coluna esquerda** (~200px): lista dos anexos com nome da pergunta (label), clicáveis
- **Coluna direita**: área de preview que carrega PDF (iframe) ou imagem ao clicar
- Botões de "Abrir em nova aba" e "Baixar" no toolbar do preview
- Manter o `AttachmentViewer` modal como opção secundária ("Expandir")

#### 2. Separar visualmente anexos do formulário e deferimento
- Seção "Anexos da Solicitação" (formulário) com ícone `Paperclip` e fundo `bg-blue-50/30`
- Seção "Documentos de Deferimento" separada com ícone `FileText` e fundo `bg-amber-50/30`
- Cada seção com título claro e contagem

#### 3. Criar componente `InlineAttachmentPreview`
**Novo arquivo:** `src/components/InlineAttachmentPreview.tsx`

Props:
```typescript
interface InlineAttachmentPreviewProps {
  arquivos: AttachmentItem[];
  title: string;
  onExpandClick?: () => void; // abre AttachmentViewer modal
}
```

Layout interno:
- Container com altura fixa (~350px)
- Sidebar esquerda com `ScrollArea` listando anexos (nome da pergunta)
- Item selecionado destacado com borda primária
- Área principal com preview (iframe para PDF, img para imagens, fallback para outros)
- Toolbar com botões Download/Abrir/Expandir
- Indicador de erro para anexos que falharam

#### 4. Gerar URLs assinadas para anexos de deferimento
**Arquivo:** `src/components/AnaliseDialog.tsx`

Na busca de `deferimento_documents`, adicionar lógica de `createSignedUrl` para o bucket `deferimento` (igual ao que já é feito para `form-uploads`), garantindo que as URLs sempre funcionem.

#### 5. Validação pré-upload no FormRenderer
**Arquivo:** `src/components/form-renderer/FormFieldRenderer.tsx`

Antes de aceitar o arquivo no campo de upload:
- Validar tamanho (max 10MB)
- Validar tipo (PDF, JPG, PNG, DOC permitidos)
- Validar que o arquivo não está vazio (0 bytes)
- Exibir toast de erro específico se falhar validação
- Esses checks já existem parcialmente no backend; replicar no frontend para feedback imediato

#### 6. Toast de alerta para anexos com falha
Já implementado parcialmente. Reforçar:
- Se `failedCount > 0`, exibir toast warning com contagem
- Marcar anexos com erro no `InlineAttachmentPreview` com ícone `AlertTriangle` e texto explicativo

---

### Arquivos Modificados

| Arquivo | Ação |
|---|---|
| `src/components/InlineAttachmentPreview.tsx` | **Novo** - Componente inline de preview |
| `src/components/AnaliseDialog.tsx` | **Editar** - Substituir badges por InlineAttachmentPreview, separar deferimento, assinar URLs de deferimento |
| `src/components/form-renderer/FormFieldRenderer.tsx` | **Editar** - Adicionar validação pré-upload (tamanho, tipo, arquivo vazio) |
| `src/components/AttachmentViewer.tsx` | **Sem alterações** - Já funcional como modal expandido |

