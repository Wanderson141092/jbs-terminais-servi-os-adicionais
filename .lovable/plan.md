

## Plan: 4 Enhancements to the Form System and Dashboard

### 1. Resposta Conjunta: Individual "Permitir multiplas respostas" per subcampo

**Files:** `src/components/admin/BancoPerguntasManager.tsx`, `src/components/form-renderer/FormFieldRenderer.tsx`

- Add `conjunta_campo1_permitir_multiplos`, `conjunta_campo1_multiplos_max`, `conjunta_campo2_permitir_multiplos`, `conjunta_campo2_multiplos_max` to `formData` state.
- In the Resposta Conjunta admin config section (lines 681-754), add a checkbox "Permitir multiplas respostas" and max input inside each subcampo block.
- In `save()`, persist `permitir_multiplos` and `multiplos_max` per campo in `config.campos[].permitir_multiplos`.
- In `openDialog()`, load these values from existing config.
- In `FormFieldRenderer.tsx` resposta_conjunta rendering (lines 577-690), implement the multi-value logic (add/remove entries) per subcampo when `campo.permitir_multiplos` is true.

### 2. E-mail: Domain blocking config + validation

**Files:** `src/components/admin/BancoPerguntasManager.tsx`, `src/components/form-renderer/FormFieldRenderer.tsx`

- Add `email_bloquear_dominio` (boolean) and `email_dominio_bloqueado` (string, default `@jbsterminais.com.br`) to `formData`.
- In admin dialog, when `tipo === "email"`, show a new config section with checkbox "Bloquear dominio de e-mail especifico" and input for the domain.
- Save as `config.bloquear_dominio` and `config.dominio_bloqueado` in the question config.
- In `FormFieldRenderer.tsx`, for email fields, add `onBlur` validation: if the entered email ends with the blocked domain, clear the field and show toast "Dominio de e-mail nao permitido para envio."

### 3. Pergunta Condicional: Full type support + dropdown for trigger question

**Files:** `src/components/admin/BancoPerguntasManager.tsx`, `src/components/form-renderer/FormFieldRenderer.tsx`

**Admin (BancoPerguntasManager):**
- Expand `SUBCAMPO_TYPES` (used for conditional sub-questions) to include: `checkbox`, `arquivo`, `informativo`, `resposta_conjunta` (all types except `pergunta_condicional`).
- Replace the text input for "Pergunta-gatilho (rotulo)" (line 798) with a `Select` dropdown populated from `perguntas` (active questions from `banco_perguntas`).
- For each sub-question type, render the full configuration matching the main question type:
  - `informativo`: Show the "Configuracao do Bloco Informativo" section (content type, RichTextEditor, exigir aceite, texto aceite).
  - `checkbox`: No extra config needed.
  - `arquivo`: No extra config needed.
  - `resposta_conjunta`: Show the full 2-subcampo config block (same as the main resposta_conjunta config).
  - Existing types (texto_formatado, numero, select, multipla_escolha) already partially work -- ensure numero shows prefix/suffix/min/max config.
- Extend the sub-pergunta data model to store `info_tipo`, `info_conteudo`, `info_exigir_aceite`, `info_texto_aceite`, and `conjunta_campos` for resposta_conjunta sub-questions.
- In `save()`, serialize these new fields into `config.subperguntas[]`.

**Renderer (FormFieldRenderer):**
- In the `pergunta_condicional` rendering section (lines 692-807), add support for rendering `checkbox`, `arquivo`, `informativo`, and `resposta_conjunta` sub-question types with their full configurations.

### 4. Eye button: Restrict by sector service access

**Files:** `src/pages/InternoDashboard.tsx`

- Currently the Eye (Visualizar/Analisar) button has no service-based access restriction -- it opens `AnaliseDialog` for any process.
- Add logic to check if the user's sector is authorized for the process's `tipo_operacao`:
  - Fetch `setor_servicos` linked to the user's `email_setor` (already available as `userPerfis` pattern).
  - Load the user's sector's authorized service IDs.
  - For the Eye button, if the user is **not** admin and **not** gestor, check if their sector has access to the service matching `s.tipo_operacao`. If not, disable the button.
  - Admin and Gestor profiles retain full unrestricted access to all processes.

### Technical Details

- No database migrations required -- all changes are in config JSON stored in `banco_perguntas.config`.
- Sub-question types for pergunta_condicional will use the same `SUBCAMPO_TYPES` array, expanded to include the new types.
- The trigger question dropdown will use the existing `perguntas` state (active banco_perguntas), filtered to exclude the current question being edited.
- Email domain validation uses `onBlur` event with `toast.error("Dominio de e-mail nao permitido para envio.")` and field clearing.

