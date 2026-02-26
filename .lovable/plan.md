

## Plan: Three Corrections

### 1. Pergunta Condicional -- Bloco Informativo Configuration

**Problem**: When the sub-type "informativo" is selected inside a Pergunta Condicional, it does not show the "Configuração do Bloco Informativo" section (content type selector, content editor/URL, accept toggle, accept text).

**Changes in `src/components/admin/BancoPerguntasManager.tsx`**:
- Add informativo-specific fields to each sub-pergunta's state model: `info_tipo`, `info_conteudo`, `info_exigir_aceite`, `info_texto_aceite`.
- In the `openDialog` function, load these fields from existing `config.subperguntas[].info_*` data.
- In the default state initialization, include these fields for each sub-pergunta.
- In the `save()` function, when building `config.subperguntas`, include `conteudo_tipo`, `conteudo`, `exigir_aceite`, `texto_aceite` when `sp.tipo === "informativo"`.
- In the UI rendering for each sub-pergunta (lines ~838-950), add a conditional block: when `sp.tipo === "informativo"`, render the same "Configuração do Bloco Informativo" section (content type selector texto/imagem, content editor or URL input, accept checkbox, accept text input).

**Changes in `src/components/form-renderer/FormFieldRenderer.tsx`**:
- In the `pergunta_condicional` renderer (lines ~709-824), when the active sub-pergunta has `tipo === "informativo"`, render the informativo block (text/image content with optional accept checkbox) instead of the current input fields.

### 2. E-mail -- Bloqueio de domínio (validation message fix)

**Problem**: The error message currently says "E-mails com domínio X não são permitidos" but should say "domínio não permitido para envio."

**Changes in `src/components/form-renderer/FormFieldRenderer.tsx`**:
- Line ~420: Change the toast message from `E-mails com domínio ${dominioBloqueado} não são permitidos` to `Domínio não permitido para envio.`

### 3. Visualizar/Analisar -- Admin and Gestor full access

**Problem**: The `canAccessProcess` function only checks `isAdmin` for full access, but Gestors also need unrestricted access. The Eye button disables for non-admin/non-gestor users based on sector services, but doesn't grant Gestors the same bypass.

**Changes in `src/pages/InternoDashboard.tsx`**:
- Line 362: Update `canAccessProcess` to also check `isGestor`:
  ```typescript
  const canAccessProcess = (s: any) => {
    if (isAdmin || isGestor) return true;
    ...
  };
  ```
- This single change automatically fixes the Eye button and all other action buttons that use `canAccessProcess`, since the guard already covers them all.
- The `!isAdmin` checks on the Eye button's `disabled` and `className` props (lines 880-881) should also include `!isGestor`:
  ```typescript
  disabled={!canAccessProcess(s) && !isAdmin && !isGestor}
  className={!canAccessProcess(s) && !isAdmin && !isGestor ? "text-muted-foreground/40" : ""}
  ```

### Files Modified
- `src/components/admin/BancoPerguntasManager.tsx` -- informativo config for condicional sub-perguntas
- `src/components/form-renderer/FormFieldRenderer.tsx` -- render informativo in condicional + email message fix
- `src/pages/InternoDashboard.tsx` -- gestor access bypass

