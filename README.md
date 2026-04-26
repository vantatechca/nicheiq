# NicheIQ

Market intelligence platform that discovers digital product opportunities across major online marketplaces and trend sources. Niche-agnostic. Built for solo founders, indie creators, and small teams.

## Quick start

```bash
cp .env.local.example .env.local
npm install
npm run dev
```

Open http://localhost:3000 — login with one of the seeded mock credentials shown on the login page.

## Stack

- Next.js 14 App Router, TypeScript strict
- Tailwind CSS + shadcn/ui
- Drizzle ORM + Neon Postgres + pgvector
- NextAuth v4 (CredentialsProvider, JWT)
- Upstash Redis (cache + rate limit)
- Inngest (background jobs / cron)
- AI tiers: Kimi/Qwen via OpenRouter (bulk), Claude Haiku (analysis), Claude Sonnet 4 (Brain + digests)
- Recharts, lucide-react, react-hook-form, zod, sonner

## Mock mode

`USE_MOCK=true` returns rich mock data for every API route so the whole product is clickable end-to-end without external services.

## Build phases

A. Foundation · B. Schema + mocks · C. Auth + layout · D. Pages · E. APIs · F. Scoring · G. Brain · H. DB + Inngest · I. Crawlers + AI · J. Polish + deploy.
