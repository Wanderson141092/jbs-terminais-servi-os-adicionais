

# Plan: Complete Implementation/Fix of All 25 Items

Many of these items were partially implemented in Phases 1-7 but have gaps or bugs. This plan addresses every remaining issue.

---

## Group A: Already Implemented — Needs Verification/Fixes Only

These items were implemented but may have bugs based on the code review:

| # | Item | Status | Fix Needed |
|---|------|--------|------------|
| 2 | Sigla field missing in status dialog | Code exists (line 276-281 in ParametrosCamposManager) | Verify `showSigla: true` is set for `status_processo` — **already set** on line 39. Should work. |
| 5 | Status correction reset | Code exists in StatusCorrectionDialog | Already clears fields. Verify it also clears `status_vistoria` to null. |
| 6 | Desfazer lançamento | `handleDesfazerLancamento` exists (line 796) | Verify UI button renders for each confirmed config. |
| 8 | Internal/External observation toggle | `observacaoTipo` state exists (line 65) | Verify toggle UI renders and external observations update `solicitacoes.observacoes`. |
| 9 | Logs detail modal | Code exists in AdminLogs | Already has Eye button + detail modal. |
| 13 | NavisN4 service/status filters | Already added | Verify functionality. |
| 15 | Conditional self-reference block | Already added in FormularioBuilder | Verify. |
| 17 | Prefix validation (3 chars) | Already updated regex | Verify. |
| 19 | Cutoff by weekday | Already added in GestorRegras | Verify. |
| 22 | Protocol format JBS+Letter+YY+6digits | Already migrated | Verify. |
| 24 | External page button sizing | Already reduced | Verify. |
| 25 | Logoff redirect & /interno redirect | Already updated | Verify. |

---

## Group B: Needs Implementation or Significant Fixes

### B1. Item 1 — Status Group Structure & Validation with Timeline (Moderate)
**Current state**: `grupo_status` field exists in `ParametrosCamposManager` with 3 options.
**Missing**: The status group needs to integrate with `consulta_etapas_config` (Timeline). The classification rule (Posicionamento? → Vistoria vs Serviço vs Outros) should be documented in the UI and optionally enforced.
**Plan**:
- Add descriptive help text in the `grupo_status` selector explaining the classification tree
- When creating/editing timeline etapas in `ConsultaEtapasManager`, show which status groups they map to
- No schema changes needed — `grupo_status` column already exists

### B2. Item 3 — Encrypted name in header (Bug Fix)
**Current state**: Dashboard uses `profiles_v` view which should decrypt. The `nome` field shows encrypted because `profiles_v` calls `decrypt_pii(nome)`.
**Root cause**: The view `profiles_v` likely already decrypts. Need to verify the view definition. If `profile?.nome` still shows encrypted text, it could be that the view isn't returning the decrypted value properly.
**Plan**:
- Query the view definition to confirm it decrypts `nome`
- If the view is correct but the name was double-encrypted (encrypted before trigger was added), fix by running a data correction
- Ensure `AdminLogs` also uses `profiles_v` for display names (it currently does)

### B3. Item 4 — Recusa requires motivo + show in external page
**Current state**: `executeRecusa` already saves motivo as `tipo_observacao: "externa"`. The `consulta-publica` edge function filters for `tipo_observacao = 'externa'`.
**Missing**: Verify that the external `ConsultaResultado` component actually displays the recusa reason when status is `recusado`. Check `consulta-publica` returns observations properly.
**Plan**:
- In `ConsultaResultado.tsx`, add a section that shows the refusal reason from `observacoes` when status is `recusado`
- Verify `consulta-publica` returns `observacoes` array with `tipo_observacao = 'externa'`

### B4. Item 7 — Toggle Activation Logic Fix (Complex)
**Current state**: Toggles show based on service config status/pendency lists.
**Missing**: The described rule is: (1) if current status matches config AND service matches → show toggle section; (2) if a pendency checkbox is checked (even before saving) → show the toggle immediately.
**Plan**:
- In `AnaliseDialog.tsx`, refactor toggle visibility logic:
  - Check if `servicoConfig` matches current service
  - Check if `selectedStatus` is in `deferimento_status_ativacao` or `lacre_armador_status_ativacao`
  - Additionally, if any `pendenciasSelecionadas` matches `deferimento_pendencias_ativacao` or `lacre_armador_pendencias_ativacao`, show the toggle immediately
- Ensure the toggle appears reactively when a pendency checkbox is clicked (before save)

### B5. Item 10 — Batch Billing Registration (New Feature)
**Plan**:
- Create `BatchBillingDialog.tsx` component
- Add batch action button in dashboard when multiple processes are selected
- For each selected process, create/confirm `lancamento_cobranca_registros` entries
- Support both service billing and lacre positioning billing

### B6. Item 11 — Manual Auto-Update + Back Button Fix
**Current state**: `AdminParametrosAjuda.tsx` uses static `DOCUMENTACAO` array.
**Plan**:
- Add "Atualizar Manual" button that fetches current field configs from DB and rebuilds documentation
- Fix back button to navigate to `/interno/admin/parametros` instead of `/interno/dashboard`

### B7. Item 12 — Custom Reports for Deferimento & Billing
**Plan**:
- In `ExtrairRelatorioDialog.tsx`, add filter toggles:
  - "Apenas processos com Deferimento" (filter where `solicitar_deferimento = true`)
  - "Apenas processos com Lançamento de Cobrança" (filter by `lancamento_cobranca_registros` existence)

### B8. Item 14 — Conditional sub-questions inherit full config
**Plan**:
- In `FormularioBuilder.tsx`, when adding a sub-question to a conditional, render the full field configuration (masks, domain blocking, options import, width control, etc.) exactly like the main question type
- In `FormFieldRenderer.tsx`, ensure sub-questions pass through all config properties

### B9. Item 16 — Description/subtitle field for form questions
**Current state**: `banco_perguntas` table has `descricao` column.
**Plan**:
- In `FormularioBuilder.tsx`, add `descricao` input field with italic/font-size options
- In `FormFieldRenderer.tsx`, render description below the label in italic with smaller font

### B10. Item 18 — Lacre Armador External Page Fixes (Complex)
**Plan**:
- In `ConsultaResultado.tsx`: respect `is_active` toggle for each lacre config field
- Show "Mensagem de custo do Lacre" and "Tipo de Aceite do Lacre" when active
- Add toggle for "Lacre Coletado" field visibility in `PaginaExternaConfigManager`
- In `LacreArmadorDialog.tsx`: derive "Custo de Serviço" from `solicitacao.lacre_armador_aceite_custo` (Sim/Não/blank mirrors the toggle value)
- Show "Tipo de Aceite do Lacre" in "Ciente do custo de novo posicionamento" field

### B11. Item 20 — Fix "Aplica Dia Anterior" Logic
**Current state**: Logic in `enviar-formulario` (line 187-205) already implements the corrected rule.
**Plan**: Verify the implementation matches the spec:
- When enabled: cut applies only when time >= cutoff AND date is D+1 or earlier
- When disabled: cut applies purely on time >= cutoff regardless of date
- Review and fix if the current `tomorrow` calculation is correct (should compare `dataPos <= tomorrow` meaning the date is today or tomorrow)

### B12. Item 21 — Notification config: add "Administrador" option
**Current state**: `notificar-status` edge function supports `"admin"` in `setor_ids`.
**Plan**:
- In `AdminParametros.tsx` notification section, add "Administrador do Sistema" as a selectable setor option

### B13. Item 23 — Routing rules: add "Administrador" option
**Plan**:
- In `AdminParametros.tsx` routing rules section, add "Administrador" to the setor notification dropdown

---

## Implementation Order

1. **Schema fixes**: Verify `profiles_v` view decrypts `nome` correctly (Item 3)
2. **Edge function fixes**: Verify `aplica_dia_anterior` logic (Item 20)
3. **ParametrosCamposManager**: Verify grupo_status + sigla display (Items 1, 2)
4. **AnaliseDialog**: Fix toggle logic (Item 7), verify recusa/observation (Items 4, 8, 6)
5. **ConsultaResultado**: Show recusa reason, lacre fixes (Items 4, 18)
6. **LacreArmadorDialog**: Cost derivation fix (Item 18)
7. **PaginaExternaConfigManager**: Lacre field toggles (Item 18)
8. **AdminParametros**: Admin notification option (Items 21, 23)
9. **Dashboard**: Batch billing (Item 10)
10. **FormularioBuilder + FormFieldRenderer**: Sub-question config + description (Items 14, 16)
11. **ExtrairRelatorioDialog**: Deferimento/billing filters (Item 12)
12. **AdminParametrosAjuda**: Auto-update + back button (Item 11)

### Estimated Changes
- **~12 frontend files** modified
- **1 new component** (`BatchBillingDialog.tsx`)
- **1 edge function** potentially updated (`enviar-formulario` if `aplica_dia_anterior` logic needs correction)
- **Possible 1 data migration** (if `profiles_v` view needs fixing or names need re-encryption)

