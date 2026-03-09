

## Routing Audit & Fix Plan

### Root Cause Identified

There is a **race condition** in the auth guard pattern used by admin pages:

1. Page mounts → `currentUserId` starts as `null`
2. `useRoleCheck(null)` immediately resolves: `loading: false`, `isAdmin: false`, `isGestor: false`
3. The render-time guard fires: `if (!loading && !isAdmin && !isGestor) → navigate("/interno/dashboard")`
4. **Redirect happens before `getSession()` even resolves** with the real user ID

This means every admin/gestor menu click briefly redirects back to the dashboard before the session is loaded. On fast connections it may appear to work but navigates twice; on slower connections or re-renders, the user gets stuck on the dashboard.

### Affected Pages (have the buggy guard)
- `AdminParametros` (line 606)
- `AdminUsuarios` (line 425)
- `AdminServicos` (line 253)
- `AdminFormularios` (line 502)

### Pages Missing Auth Guards Entirely
- `AdminSetores` — no role check, no auth check
- `AdminLogs` — no role check, no auth check
- `AdminIntegracoes` — no role check, no auth check
- `AdminHistoricoIntegracoes` — no role check, no auth check
- `Relatorios` — has auth check but no role guard

### Fix Strategy

**1. Fix `useRoleCheck` hook** — Keep `loading: true` when `userId` is `null` (meaning session hasn't loaded yet). Only set `loading: false` with no roles when we *know* there's no user. Add a new parameter or convention to distinguish "not yet loaded" from "no user".

```text
Before:  useRoleCheck(null) → immediately loading:false, isAdmin:false
After:   useRoleCheck(null) → loading:true (waiting for session)
         useRoleCheck("no-session") → loading:false, isAdmin:false (confirmed no user)
```

Simpler approach: change the hook so that when `userId` is `null`, it keeps `loading: true`. The pages will set `currentUserId` to a sentinel value (e.g., empty string `""`) when `getSession()` confirms no session exists.

**2. Standardize auth pattern across all admin pages** — Each page that requires auth should:
- Fetch session on mount, set `currentUserId` (or redirect to `/interno` if no session)
- Pass `currentUserId` to `useRoleCheck`
- Only evaluate the role guard after both session AND role check have loaded
- Redirect unauthorized users to `/interno/dashboard`

**3. Add guards to unprotected pages** — Apply the same pattern to `AdminSetores`, `AdminLogs`, `AdminIntegracoes`, `AdminHistoricoIntegracoes`.

### Files to Change

| File | Change |
|------|--------|
| `src/hooks/useRoleCheck.ts` | Keep `loading: true` when `userId` is `null`; only resolve `false` when userId is explicitly empty string |
| `src/pages/admin/AdminParametros.tsx` | Update session fetch to set `""` on no-session; redirect unauthenticated to `/interno` |
| `src/pages/admin/AdminUsuarios.tsx` | Same pattern fix |
| `src/pages/admin/AdminServicos.tsx` | Same pattern fix |
| `src/pages/admin/AdminFormularios.tsx` | Same pattern fix |
| `src/pages/admin/AdminSetores.tsx` | Add auth + role guard |
| `src/pages/admin/AdminLogs.tsx` | Add auth guard |
| `src/pages/admin/AdminIntegracoes.tsx` | Add auth guard |
| `src/pages/admin/AdminHistoricoIntegracoes.tsx` | Add auth guard |
| `src/pages/GestorRegras.tsx` | Verify and align with same pattern |
| `src/pages/Relatorios.tsx` | Verify and align with same pattern |

