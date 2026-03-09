

## Plan: Replace fixed-column dropdown with form question picker in Campos Fixos

### Problem
Currently, "Chave do campo" in CamposFixosManager shows hardcoded `solicitacoes` table columns. The user wants to select **form questions** (from `banco_perguntas` linked to `formularios`) so that the fixed field is populated by the answer to that question. This also enables showing data from responses submitted before the field was mapped.

### Approach

**Edit `src/components/admin/CamposFixosManager.tsx`:**

1. **Load form questions on mount**: Fetch `formularios` (active, with `titulo`) and `formulario_perguntas` joined with `banco_perguntas` to get `pergunta_id`, `rotulo`, and `tipo` grouped by form.

2. **Replace the `SOLICITACOES_COLUMNS` dropdown** with a two-level picker:
   - First `Select`: choose the **formulario** (form)
   - Second `Select`: choose the **pergunta** (question) from that form
   - The `campo_chave` will store the `pergunta_id` (UUID from `banco_perguntas`)
   - Auto-fill `campo_label` with the question's `rotulo`

3. **Keep existing columns as a fallback group**: Retain `SOLICITACOES_COLUMNS` as a special "Campos da Solicitação" option in the form selector, so admins can still map to direct DB columns if needed.

4. **Display improvement**: In the table listing, show the question label and form name next to the `campo_chave` for better readability (resolve from loaded data).

### Data flow
- On save, `campo_chave` stores either a `pergunta_id` UUID (for question-based fields) or a column name (for legacy direct mappings)
- The consuming code (`AnaliseDialog`, `ConsultaResultado`, `enviar-formulario`) already resolves values from `formulario_respostas.respostas` using `pergunta_id` keys, so this aligns with the existing architecture
- Historical responses already have `pergunta_id` as keys in the JSONB, so mapping works retroactively

### Files to change
- `src/components/admin/CamposFixosManager.tsx` -- replace dropdown logic, add form/question data loading

