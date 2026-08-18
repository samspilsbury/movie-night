# Architecture

Use this directory for system context, data-flow notes, external-service
boundaries, and operational guidance. Keep documentation close to the decisions
it explains and update it when the implementation changes.

Material choices belong in `decisions/` as architecture decision records (ADRs).
Copy `0000-template.md`, assign the next four-digit number, and use a concise
slug, for example `0001-choose-web-framework.md`.

## Accepted decisions

- [ADR 0001: House Lights Down design system](decisions/0001-adopt-house-lights-down-design-system.md)
- [ADR 0002: Next.js TypeScript MVP stack](decisions/0002-adopt-nextjs-typescript-mvp-stack.md)
- [ADR 0003: Live recommendation pipeline](decisions/0003-adopt-live-recommendation-pipeline.md)
- [ADR 0004: Vercel deployment](decisions/0004-deploy-mvp-on-vercel.md)
- [ADR 0005: Relevance-first candidate reranking](decisions/0005-adopt-relevance-first-reranking.md)
- [ADR 0006: Breadth-first ranked recommendation pool](decisions/0006-adopt-breadth-first-ranked-pool.md)
