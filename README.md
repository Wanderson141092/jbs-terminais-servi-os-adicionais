# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)

## Migração gradual (3 fases)

### Fase 1 — criação de estruturas novas (sem desligar legado)
- Aplicar a migration `20260307162000_rollout_novo_modelo_processamento.sql`.
- Esta migration cria:
  - tabelas novas: `cobrancas_v2`, `process_events_v2`, `process_snapshot_v2`;
  - tabelas de operação/auditoria: `migration_runtime_flags`, `migration_backfill_runs`, `migration_backfill_checkpoints`, `migration_backfill_batches`;
  - views de leitura com switch por flag: `*_read_model`.

### Fase 2 — dual-write + validação de consistência
- Habilitar dual-write por entidade em `migration_runtime_flags.dual_write_enabled`.
- Executar backfills por lotes:
  - `supabase/scripts/backfill/cobrancas_backfill.sql`
  - `supabase/scripts/backfill/process_events_backfill.sql`
  - `supabase/scripts/backfill/process_snapshot_backfill.sql`
- Validar consistência com:
  - `select * from public.migration_validate_consistency();`

### Fase 3 — switch de leitura + desativação gradual do legado
- Ativar leitura do novo por entidade em `migration_runtime_flags.read_from_new_enabled`.
- Bloquear escrita no legado gradualmente com `migration_runtime_flags.legacy_write_disabled`.

## Feature flags de endpoint (frontend)

O frontend agora resolve endpoints novos/legados por ambiente e por endpoint usando `src/lib/backendEndpoints.ts`.

Variáveis:
- `VITE_API_ENV` (`development`, `staging`, `production`)
- `VITE_USE_NEXT_ENDPOINTS` (fallback global)
- `VITE_USE_NEXT_CONSULTAPUBLICA`
- `VITE_USE_NEXT_ENVIARFORMULARIO`
- `VITE_USE_NEXT_UPLOADPUBLICO`
- `VITE_USE_NEXT_NOTIFICARSTATUS`

Exemplo:
```env
VITE_API_ENV=staging
VITE_USE_NEXT_ENDPOINTS=true
VITE_USE_NEXT_CONSULTAPUBLICA=true
```
