# Contributing

## Before starting

1. Read `README.md`, `AGENTS.md`, and the relevant files under `docs/`.
2. Confirm the proposed work is in scope for the current product phase.
3. Create an architecture decision record for choices that are costly to
   reverse or affect multiple parts of the system.

## Development workflow

- Work in a focused branch and keep commits small and descriptive.
- Never commit secrets, local environment files, build output, or dependency
  directories.
- Add or update tests and documentation alongside implementation changes.
- Run the project's canonical formatting, linting, type-checking, test, and
  build commands before requesting review once those commands are established.

## Local setup

1. Install Node.js 22 or newer.
2. Run `npm install`.
3. Copy `.env.example` to `.env.local`.
4. Leave `MOVIE_NIGHT_DEMO_MODE=true` until provider credentials are available.
5. Run `npm run dev` and open `http://localhost:3000`.

Use `npm run check` for the canonical non-browser verification suite and
`npm run test:e2e` for the Playwright journey.

## Pull requests

Explain the user problem, the chosen approach, verification performed, and any
remaining risks or follow-up work. Include screenshots or recordings for visual
changes when application development begins.

## Commit messages

Use short, imperative subjects that explain the outcome, for example:

```text
Add product brief
Document movie data decision
Improve recommendation empty state
```
