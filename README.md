# NicheIQ

Market intelligence platform that discovers digital product opportunities across every major online marketplace and trend source. Niche-agnostic. Built for solo founders, indie creators, and small teams.

> "Bloomberg Terminal for digital product opportunities."

## Quick start

```bash
cp .env.local.example .env.local
npm install                         # legacy peer deps pre-pinned via .npmrc
npm run dev                          # http://localhost:3000

# Try the demo accounts on the login page; password is `nicheiq123`.
```

The dashboard, opportunities, products, creators, niches, trends, sources, rules, digest, resellable, analytics, settings, feed, and Brain pages all render with realistic mock data out of the box.

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 App Router · TypeScript strict |
| Styling | Tailwind CSS · shadcn/ui · Recharts · lucide-react |
| Data | Drizzle ORM · Neon Postgres · pgvector |
| Auth | NextAuth v4 (Credentials + JWT, max 4 seats) |
| Cache + RL | Upstash Redis · @upstash/ratelimit |
| Jobs | Inngest (durable cron + event functions) |
| Real-time | SSE on Node runtime |
| AI tiers | Tier 1 OpenRouter (Qwen) · Tier 2 Claude Haiku · Tier 3 Claude Sonnet |
| Email | Resend (optional) |
| Tests | Vitest (unit) · Playwright (one happy-path E2E) |

## Build phases

The repo was assembled in 10 phases, each on a single feature branch. Every phase commit is in `git log`.

| Phase | Focus | Key paths |
|---|---|---|
| A | Foundation | `package.json`, `tsconfig.json`, `tailwind.config.ts`, `components/ui/*` (31 shadcn primitives) |
| B | Schema + mocks | `src/lib/db/schema.ts`, `drizzle/0000_initial.sql`, `src/mock/data.ts` |
| C | Auth + layout | `src/lib/auth/options.ts`, `src/middleware.ts`, `src/components/layout/*` |
| D | Pages | 18 routes under `src/app/(dashboard)/*` |
| E | API | ~50 routes under `src/app/api/*`, including SSE feed |
| F | Scoring | `src/lib/scoring/{engine,golden-rules,feedback-patterns}.ts` + Vitest |
| G | Brain | `src/lib/ai/{client,context-assembler,prompts}` + streaming chat |
| H | DB + Inngest | `src/inngest/{client,functions/*}`, `src/lib/redis/client.ts` |
| I | Crawlers | `src/lib/crawlers/{reddit,hacker-news,product-hunt,envato,kaggle}.ts` |
| J | Polish | Recharts, theme toggle, Playwright E2E, this README |

## Environment

See `.env.local.example` for the full list. Minimum to run in mock mode is just `NEXTAUTH_SECRET` (anything random).

## Mock vs live

Set `USE_MOCK=true` (default) to run the entire app against `src/mock/data.ts` — no DB, no AI keys, no crawler endpoints required. Flip to `USE_MOCK=false` to:
- route auth through Drizzle/Neon (`DATABASE_URL` required)
- stream real Anthropic responses on `POST /api/brain/chat` (`ANTHROPIC_API_KEY` required)
- run Inngest jobs against the real Postgres

## AI tier configuration

Three tiers are exposed by `selectModel({ tier })`:

```ts
import { selectModel } from "@/lib/ai/client";

const tier3 = selectModel({ tier: 3 });
for await (const chunk of tier3.stream({
  system: assembleContext({ mode: "global", refIds: {}, userId }),
  messages: [{ role: "user", content: "What should I build?" }],
})) process.stdout.write(chunk);
```

A daily spend cap (`AI_DAILY_SPEND_CAP`) is enforced via Upstash. Tier-3 calls refuse above the cap.

## Crawlers and sources

`src/lib/crawlers/registry.ts` maps each `sourcePlatform` to a `CrawlerModule`. Public-API sources (Reddit JSON, Hacker News, Product Hunt GraphQL, Envato, Kaggle) are wired. ToS-sensitive sources (Etsy browse, Gumroad Discover, Creative Market, Notion marketplace, etc.) are interface-stubbed and route through Apify / ScrapingBee / Bright Data in production. Build the credential-less integrations first, then layer headless on top.

## Commands

```bash
npm run dev                  # local dev (mock mode)
npm run build                # next build
npm run typecheck            # tsc --noEmit
npm run lint                 # next lint
npm test                     # vitest run
npm run test:e2e             # playwright (requires `npx playwright install` first)
npm run db:generate          # drizzle-kit generate
npm run db:migrate           # drizzle-kit migrate (needs DATABASE_URL)
npm run db:seed              # tsx src/lib/db/seed.ts
```

## Vercel deploy

1. Push the repo, import into Vercel.
2. Set env vars from `.env.local.example`. Required: `NEXTAUTH_SECRET`, `DATABASE_URL`, `ANTHROPIC_API_KEY`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`.
3. Set `USE_MOCK=false`.
4. After first deploy, run `INNGEST_SIGNING_KEY=… npx inngest-cli sync --url https://<your-domain>/api/inngest` to register cron functions.
5. Run `DATABASE_URL=… npm run db:migrate` then `npm run db:seed` to populate the seed data.

## Testing

```bash
npm test                     # unit tests (scoring engine etc.)
npm run test:e2e             # one happy-path Playwright spec
```

## Folder map

```
src/
├── app/
│   ├── (auth)/login/...
│   ├── (dashboard)/         # 15 dashboard routes + 4 detail pages
│   └── api/                 # ~50 REST + SSE routes
├── components/
│   ├── ui/                  # 31 shadcn primitives
│   ├── layout/              # sidebar, topbar, mobile sidebar, theme toggle
│   ├── brain/               # chat window, mode picker
│   └── shared/              # KPI card, score badge, score bar, charts, etc.
├── inngest/                 # client + 9 cron/event functions
├── lib/
│   ├── ai/                  # multi-tier client, context assembler, prompts, schemas
│   ├── auth/                # NextAuth options + session helper
│   ├── crawlers/            # per-source modules + registry
│   ├── db/                  # schema, client (Neon proxy), seed
│   ├── hooks/               # use-sse, use-brain-chat, use-debounced
│   ├── scoring/             # engine + rules + patterns + tests
│   ├── redis/               # Upstash client + ratelimit factory
│   ├── api/                 # response helpers
│   ├── types/               # shared TS types + next-auth augment
│   └── utils/               # constants, format, validation
├── middleware.ts            # NextAuth-protected dashboard
└── mock/                    # all mock data
```

## License

Private — internal tool.
