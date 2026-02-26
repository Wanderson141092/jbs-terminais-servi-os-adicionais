

# Editor Rico (WYSIWYG) para o Bloco Informativo

## O que sera feito
Substituir o `Textarea` simples na configuracao do Bloco Informativo por um **editor de texto rico (WYSIWYG)** com botoes de formatacao (negrito, italico, listas, etc.). O conteudo sera salvo em HTML e renderizado formatado no formulario publico.

## Biblioteca escolhida: Tiptap
Tiptap e a biblioteca mais popular e leve para editores ricos em React. Sera necessario instalar:
- `@tiptap/react` - Core do editor para React
- `@tiptap/starter-kit` - Extensoes basicas (negrito, italico, listas, titulos, etc.)

## Funcionalidades do editor
- **Negrito** (Ctrl+B)
- **Italico** (Ctrl+I)
- **Lista com marcadores**
- **Lista numerada**
- **Titulos** (H2, H3)
- **Separador horizontal**
- Barra de ferramentas com botoes visuais

---

## Detalhes Tecnicos

### Novo componente: `src/components/admin/RichTextEditor.tsx`
Criar um componente reutilizavel que encapsula o Tiptap:
- Props: `content` (string HTML), `onChange` (callback com HTML)
- Barra de ferramentas com botoes para cada formatacao
- Estilizacao consistente com o design system existente (Tailwind)
- Area de edicao com borda e padding similares ao Textarea atual

### Arquivo: `src/components/admin/BancoPerguntasManager.tsx`
- Importar o novo `RichTextEditor`
- Substituir o `Textarea` (linhas 847-852) pelo `RichTextEditor` quando `info_tipo === "texto"`
- O valor continua sendo salvo em `info_conteudo`, mas agora contera HTML em vez de texto puro

### Arquivo: `src/components/form-renderer/FormFieldRenderer.tsx`
- Atualizar a renderizacao do bloco informativo (linhas 199-201) para usar `dangerouslySetInnerHTML` em vez de `whitespace-pre-wrap`
- Adicionar classes CSS basicas para estilizar o HTML renderizado (listas, negritos, etc.)
- Manter compatibilidade com conteudo antigo em texto puro (fallback)

### Arquivo: `src/index.css`
- Adicionar estilos para o conteudo renderizado do editor rico (`.prose-content` ou similar):
  - Estilos para `ul`, `ol`, `strong`, `em`, `h2`, `h3`, `hr`
  - Garantir que listas tenham marcadores visiveis

### Nenhuma alteracao de banco de dados necessaria
O campo `config.conteudo` ja e texto livre (JSONB). Passara a armazenar HTML em vez de texto puro.

