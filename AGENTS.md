# Movie Night repository instructions

## Product intent

Movie Night helps people confidently choose a movie with minimal browsing. The
experience should feel focused, quick, trustworthy, and enjoyable. Prefer
decisive flows and progressive disclosure over large catalogues or dense grids.

## Current phase

- The Next.js TypeScript MVP is in development. See ADRs 0002 and 0003 before
  changing the stack or recommendation pipeline.
- Record material technical choices in `docs/architecture/decisions/`.

## Working agreements

- Read the product brief and relevant architecture decisions before changing
  behavior.
- Keep features cohesive under `src/features/`; keep genuinely shared building
  blocks in `src/components/` or `src/lib/`.
- Keep secrets out of Git. Document required variables in `.env.example` using
  safe placeholder values.
- Include appropriate automated tests with behavior changes once the test
  toolchain exists.
- Preserve accessibility, responsive behavior, performance, privacy, and clear
  error states as baseline requirements rather than follow-up work.
- Prefer small, reviewable changes. Avoid unrelated refactors.
- Update documentation when scope, setup, architecture, or behavior changes.

## Verification

- `npm run format` checks formatting.
- `npm run lint` runs ESLint.
- `npm run typecheck` runs strict TypeScript checking.
- `npm test` runs unit and component tests.
- `npm run test:e2e` runs the critical browser journey.
- `npm run build` creates the production build.
- `npm run check` runs the canonical non-browser verification suite.

## Code review rules

- Flag any interaction that encourages unbounded browsing instead of helping a
  user make a decision.
- Flag committed credentials, undocumented environment variables, inaccessible
  controls, and collection of personal data without an explicit product need.
- Flag new dependencies or architectural patterns that are not justified by the
  requested change or an accepted decision record.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
