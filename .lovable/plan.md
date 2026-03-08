
## Plano: Reposicionar "Ações de Cancelamento / Recusa"

**Objetivo:** Mover o bloco de ações de cancelamento/recusa da parte inferior esquerda para a parte superior direita do diálogo, com botões empilhados verticalmente.

### Alteração em `src/components/AnaliseDialog.tsx`

1. **Remover** o bloco atual (linhas ~1733-1766) da posição inferior.

2. **Inserir** o mesmo bloco logo após o `DialogHeader` (após linha ~1063), antes do `<div className="space-y-4">`, posicionado no canto direito com layout vertical:
   - Container com `flex justify-end`
   - Box compacto com `flex flex-col gap-2` (botões um abaixo do outro)
   - Manter o estilo visual existente (`bg-destructive/5`, borda, etc.)

