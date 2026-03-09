

## Plan: Fix Form Response Processing, Display & Export

### Problems Found

1. **Critical Bug in `enviar-formulario`**: `normalizedRespostas` is used on line 79 (inserting into `formulario_respostas`) but is only defined on line 114. This means form responses are saved with the raw `respostas` variable reference (which happens to work due to Deno's function-level processing, but the `normalizedRespostas` object is empty/undefined at that point).

2. **Excel Export shows raw JSON**: The `exportXLSX` function in `AdminFormularios.tsx` uses `normalizeFormValue` with `preserveObjects: true`, which just `JSON.stringify`s objects. For `resposta_conjunta` fields (e.g., IMO with Classe/UN, Despachante with Nome/Email), the export shows `{"campo1":"value","campo2":"value"}` instead of decomposed sub-fields.

3. **Analysis Dialog sub-field extraction**: The `extractSubFields` function works for `resposta_conjunta` when `config.campos` exists, but the `config` object isn't always passed through correctly from the form response loading logic. Also, values inside `resposta_conjunta` that are themselves arrays (e.g., `{"campo1":["1.4 – Explosivos"],"campo2":["X989"]}`) aren't being flattened.

### Changes

#### 1. Fix `enviar-formulario` edge function — move normalization before insert
Move the `normalizedRespostas` construction block (lines 113-119) to BEFORE the insert on line 77. This ensures the stored data in `formulario_respostas` is properly normalized.

**File**: `supabase/functions/enviar-formulario/index.ts`

#### 2. Fix Excel export to decompose composite fields
Update `exportXLSX` in `AdminFormularios.tsx` to:
- For `resposta_conjunta` questions: expand sub-columns (e.g., "IMO > Classe", "IMO > UN") using the question's `config.campos` metadata
- For array values: join with line breaks instead of showing JSON brackets
- Strip all JSON artifacts (`[]`, `{}`, `""`) from cell values

**File**: `src/pages/admin/AdminFormularios.tsx`

#### 3. Improve sub-field extraction in AnaliseDialog
Update `extractSubFields` to handle nested arrays within `resposta_conjunta` objects (e.g., `campo1: ["1.4 – Explosivos"]` should display as `"1.4 – Explosivos"`, not `["1.4 – Explosivos"]`).

**File**: `src/components/AnaliseDialog.tsx`

#### 4. Align ProcessoViewDialog with same fixes
Apply the same `extractSubFields` improvement to `ProcessoViewDialog.tsx`.

**File**: `src/components/ProcessoViewDialog.tsx`

### Technical Details

**Edge function fix** (move normalization up):
```text
Before: insert(respostas: normalizedRespostas) → define normalizedRespostas
After:  define normalizedRespostas → insert(respostas: normalizedRespostas)
```

**Excel sub-column expansion**: For each `resposta_conjunta` question, fetch the question's `config.campos` array and create separate columns per sub-field. The header becomes "ParentLabel > SubLabel". The cell value is the clean string from `obj.campo1`, `obj.campo2`, etc.

**Sub-field array flattening**: When `extractSubFields` encounters a value like `["1.4 – Explosivos"]` inside a campo, it should join array items with `, ` instead of showing the raw array.

