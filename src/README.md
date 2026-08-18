# Source layout

The Next.js TypeScript application lives here.

- `app/`: application entry points, routing, and composition.
- `features/`: cohesive product capabilities and their local concerns.
- `lib/`: shared utilities plus server-only OpenAI and TMDB boundaries.
- `styles/`: global styles, design tokens, and shared styling foundations.
  Prefer feature-local code over prematurely placing everything in a shared
  directory. The accepted stack and provider boundaries are recorded in ADRs 0002
  and 0003.
