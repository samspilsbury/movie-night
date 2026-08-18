# ADR 0004: Deploy the MVP on Vercel

- Status: Accepted
- Date: 2026-08-18
- Owners: Project team

## Context

The MVP needs a production host that supports the Next.js Node.js runtime and
server route handlers selected in ADR 0002. The first Vercel deployment built
successfully but returned Vercel's platform-level `404: NOT_FOUND` because the
project was not using the Next.js build output.

The repository contains a `public/` directory for static assets. When Vercel
treats the project as an unconfigured static site, it publishes that directory;
because it has no root `index.html`, requests to `/` return a platform 404 even
though the deployment is marked Ready.

## Decision

- Use Vercel for the MVP deployment.
- Keep `vercel.json` at the application root and pin the framework to Next.js.
- Run the repository's existing `npm run build` command on Vercel.
- Clear custom output-directory configuration so Vercel uses its managed
  Next.js build output rather than publishing `public/` as the site root.
- Keep the Vercel project Root Directory set to the repository root.
- Configure live provider secrets through Vercel environment variables; never
  commit them or expose them with `NEXT_PUBLIC_` names.

## Consequences

- Deployment configuration that affects framework detection and build output
  is reviewable alongside the application code.
- Vercel can deploy the static page, server route handlers, and image optimizer
  as one Next.js application.
- Changes to the Vercel Root Directory remain a dashboard setting and take
  effect only on a subsequent deployment.

## Follow-up

- Add production environment variables before switching
  `MOVIE_NIGHT_DEMO_MODE` to `false`.
- Add request throttling and operational monitoring before public launch, as
  required by ADR 0003.
