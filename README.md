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

## Deploy to Vercel

The repository includes `vercel.json` so Vercel builds and serves it as a
Next.js application. In the Vercel project's **Settings → Build and
Deployment**, keep **Root Directory** empty (the repository root). The framework,
build command, and default Next.js output are pinned by the repository.

Set the variables from `.env.example` in Vercel for the environments that need
them. Demo mode works without provider credentials; live mode requires both
`OPENAI_API_KEY` and `TMDB_API_TOKEN`. Redeploy after changing build settings or
environment variables.

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
- [Relevance-first candidate reranking](docs/architecture/decisions/0005-adopt-relevance-first-reranking.md)
- [Vercel deployment](docs/architecture/decisions/0004-deploy-mvp-on-vercel.md)

Analytics and public-launch monitoring remain future decisions.
