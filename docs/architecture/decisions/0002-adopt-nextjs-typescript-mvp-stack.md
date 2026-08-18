# ADR 0002: Adopt the Next.js TypeScript MVP stack

- Status: Accepted
- Date: 2026-08-18
- Owners: Project team

## Context

Movie Night now needs a small end-to-end application. Both the OpenAI and TMDB
credentials must remain server-side, while the interface needs a fast,
accessible transition between a single natural-language prompt and a single
movie recommendation.

The initial release does not need accounts, durable user data, a database, or a
separate API service.

## Decision

- Use Next.js 16 with the App Router and React 19.
- Use strict TypeScript throughout the browser and server boundaries.
- Use npm and commit the generated lockfile.
- Keep provider integrations in `src/lib/` and the recommendation journey in
  `src/features/recommendations/`.
- Implement server-only route handlers for OpenAI and TMDB access. No provider
  secret may be exposed through a public environment variable.
- Use the official OpenAI JavaScript SDK with Structured Outputs and Zod for
  runtime validation.
- Use Vitest and Testing Library for unit/component tests and Playwright for the
  critical browser journey.
- Use ESLint, TypeScript, and Prettier as the canonical static checks.
- Self-host Anton and Commissioner through packaged WOFF2 font assets.

Hosting remains deliberately unspecified. The application can run on any
platform that supports the Next.js Node.js runtime and server route handlers.

## Alternatives considered

### Static React/Vite application

It would provide a smaller browser-only build, but safely calling OpenAI and
TMDB would still require a separate server or edge-function project.

### Separate frontend and API services

This offers independent scaling but creates deployment and operational work
that the MVP does not need.

### Durable database-backed sessions

Useful for accounts and history later, but unnecessary for a session-scoped
queue and contrary to the initial privacy and simplicity goals.

## Consequences

- Development and production require a JavaScript server runtime.
- The browser can keep the ephemeral recommendation queue in session storage;
  closing the tab discards it.
- Live provider behavior can be tested without changing the UI by disabling
  deterministic demo mode and supplying server-only credentials.
- A future host choice may require small runtime or caching adjustments.

## Follow-up

- Revisit persistence only if saved history or cross-device sessions become a
  validated user need.
- Select hosting and CI before the first public deployment.
