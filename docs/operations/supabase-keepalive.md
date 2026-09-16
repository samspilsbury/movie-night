# Supabase keep-alive

The free Supabase project is kept active by a scheduled GitHub Actions workflow.
Twice a day, the workflow updates one fixed row in `public.project_keepalive`.
It does not add rows indefinitely and it does not make the table public.

## One-time setup

1. Open the relevant project in Supabase.
2. Open **SQL Editor**, paste in
   [`supabase/setup-keepalive.sql`](../../supabase/setup-keepalive.sql), and run
   it.
3. In Supabase, copy the **Project URL** from the project's Connect dialog. In
   **Settings → API Keys**, create a dedicated secret key for this job (for
   example, `movie-night-keepalive`). Treat this key as a secret.
4. In the GitHub repository, open **Settings → Secrets and variables → Actions**
   and create these repository secrets:
   - `SUPABASE_URL`
   - `SUPABASE_SECRET_KEY`
5. Merge or push the workflow to the repository's default branch.
6. Open **Actions → Keep Supabase active → Run workflow** once, then confirm
   that the run succeeds and that `public.project_keepalive` contains one row.

The scheduled workflow runs at approximately 05:17 and 17:17 UTC. GitHub may
start scheduled jobs later during busy periods.

## Run locally

For a one-off check, provide the same two environment variables without saving
them in the repository, then run:

```sh
npm run supabase:keepalive
```

Do not add either real value to `.env.example` or any committed file.
