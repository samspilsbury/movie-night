# Movie Night

Movie Night is a simple website for choosing something to watch without the
analysis paralysis of endlessly browsing streaming catalogues.

## Status

The first Next.js MVP is in development. It accepts one natural-language movie
brief, presents a short cinema-countdown transition, and reveals one
recommendation at a time. Deterministic demo data keeps the full journey usable
without provider credentials.

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`. Demo mode is enabled by default. When live
credentials are available, add them to `.env.local` and set
`MOVIE_NIGHT_DEMO_MODE=false`.

## Repository map

```text
.
├── .github/                 GitHub contribution and automation templates
├── docs/
│   ├── architecture/        Architecture notes and decision records
│   ├── design/              Design principles, research, and assets guidance
│   └── product/             Product brief, scope, and roadmap
├── public/                  Static files served unchanged by the website
├── scripts/                 Project automation and maintenance scripts
├── src/                     Next.js application and provider integrations
└── tests/                   Unit, integration, and end-to-end tests
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the development workflow and
[AGENTS.md](AGENTS.md) for the repository instructions used by Codex.

The visual language is defined in the
[House Lights Down design system](docs/design/design-system.md), with a
standalone browser specimen at `docs/design/specimen.html`.

## Architecture

- [MVP stack](docs/architecture/decisions/0002-adopt-nextjs-typescript-mvp-stack.md)
- [Live recommendation pipeline](docs/architecture/decisions/0003-adopt-live-recommendation-pipeline.md)

Hosting, analytics, and public-launch monitoring remain future decisions.
