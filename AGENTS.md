# Agent Guide — nicheiq

> Read this before writing any code in this repo. It encodes conventions that aren't obvious from the file tree.

## What this app is

NicheIQ is a market intelligence platform for digital product opportunities. Crawls public sources (Reddit, HN, Product Hunt, Kaggle, Envato) and ToS-sensitive ones via proxies (Apify / ScrapingBee / Bright Data), scores opportunities, and surfaces them in a dashboard. Internal tool, max 4 seats.

## Stack — what it actually is

- **Next.js 14 App Router** (not 15, not 16 — pinned at 14.2.18). React 18.3, not React 19.
- **TypeScript strict**. No `any`. Use `unknown` + Zod/type guards.
- **Drizzle ORM** + Neon Postgres + pgvector. Schema lives in `src/lib/db/schema.ts`.
- **NextAuth v4** (JWT strategy, credentials provider, bcrypt). Max 4 seats enforced in `src/lib/auth/options.ts`.
- **Upstash Redis** for rate limiting AND for the daily AI spend cap (`AI_DAILY_SPEND_CAP`).
- **Inngest** for durable jobs and crons. Functions in `src/inngest/functions/`.
- **SSE on Edge runtime** for streaming chat. Standard runtime for DB-heavy routes.
- **Tiered AI**: OpenRouter (Qwen) → Claude Haiku → Claude Sonnet. Use `selectModel({ tier })`.
- **Vitest** for unit tests, **Playwright** for one happy-path E2E.

## Mock-mode-first — this is important

`USE_MOCK=true` is the local default. The entire app runs against `src/mock/data.ts` with no DB, no AI keys, no crawler endpoints. **Any new feature must work in mock mode.** If you can't run with mocks, the mocks are wrong — fix them.

## Folder rules

- All non-UI logic lives under `src/lib/`. Components import from lib, never the reverse.
- shadcn primitives in `src/components/ui/` are **never edited** — they're regenerable. Composites go in `src/components/shared/`.
- Route groups: `(auth)` is public, `(dashboard)` is protected by middleware.
- File naming: kebab-case files (`use-debounced.ts`), PascalCase React components.

## API route conventions

Standardized response envelope from `src/lib/api/`:

```ts
import { ok, fail } from "@/lib/api/response";
return ok(data);                     // { ok: true, data }
return fail("Invalid input", 400);   // { ok: false, error }
```

Every public route MUST:

1. Rate-limit via `@upstash/ratelimit` (anonymous tier + authenticated tier).
2. Validate the body with Zod **before** any business logic runs.
3. Auth via `getServerSession` or middleware redirect.
4. Validate HMAC signatures on webhooks, using per-source env vars.
5. Never log raw payloads. Log a hash + context (route, user id) instead.
6. Delegate business logic to `src/lib/` modules — no logic in route files.

## AI integration rules

- Never reference a model provider directly. Always `selectModel({ tier })`.
- Tier 1 = cheapest (Qwen via OpenRouter). Tier 3 = premium (Claude Sonnet).
- Daily spend cap (`AI_DAILY_SPEND_CAP`) enforced via Upstash counter. Tier 3 refuses above cap.
- Prompts live in `src/lib/ai/prompts/` as named files — **never inline a prompt** in a route or component.
- Context is assembled by `src/lib/ai/context-assembler.ts`. Don't duplicate context-building logic.
- All structured AI output is parsed through a Zod schema before downstream use.

## Crawler conventions

- New sources go in `src/lib/crawlers/{source-name}.ts`.
- Each crawler exports the same typed contract: `crawl(input) => Promise<CrawlResult[]>`.
- Register in `src/lib/crawlers/registry.ts` — `sourcePlatform` string → module.
- Build credential-less sources first (public APIs). ToS-sensitive sources go through Apify / ScrapingBee / Bright Data via the proxy layer — never direct.
- Rate limit and backoff live inside the crawler module, not the caller.
- Every crawler has a mock implementation. The registry resolves to mocks under `USE_MOCK=true`.

## Background job conventions

- One function per file under `src/inngest/functions/`.
- Cron jobs use idempotency keys (a retried cron must never double-charge or double-send).
- Long-running jobs report progress to Redis or DB. No silent jobs.
- Job names use stable prefixes (`crawl.`, `score.`, `digest.`, `email.`) for dashboard filtering.
- After deploy, sync to Inngest via the CLI — instructions are in the README.

## Frontend conventions

- shadcn/ui primitives untouched. Tailwind utility classes — no inline `style` except for dynamic values (chart sizes etc.).
- Recharts for charts, lucide-react for icons. No mixing icon libraries.
- Every async UI has a skeleton (not a spinner).
- Every list has an explicit empty-state component — never "No data".
- Forms use react-hook-form + Zod resolver. **Use the same Zod schema as the API route.**

## Testing conventions

- Vitest unit tests for: scoring engine, validators, AI output parsers, pure utilities.
- One Playwright happy-path E2E: login → core action → result.
- Unit tests colocated as `foo.ts` + `foo.test.ts`. E2E in `tests/e2e/`.
- Tests use mock data only. Never hit real DB or external APIs in CI.

## Security non-negotiables

- Secrets never committed. `.env.local.example` is the contract.
- Webhooks validate HMAC from per-source env vars.
- Never log payment data, full webhook bodies, or auth tokens — even in dev.
- No `dangerouslySetInnerHTML` unless sanitized AND code-reviewed.
- `npm audit` clean before deploy.

## Git workflow

- Conventional commits: `feat:`, `fix:`, `chore:`, `refactor:`, `docs:`, `test:`.
- Branches: `feature/short-description` or `phase-x-description` for greenfield work.
- One commit per logical unit. Squash on merge to `main`.
- `main` is protected: PR required, CI green, no force-push.

## Common mistakes to avoid

- **Don't bump Next.js or React.** This repo is intentionally on 14.2.18 / 18.3. Bumps are coordinated across the codebase.
- **Don't add a second ORM.** Drizzle only. If something feels like it needs Prisma, ask first.
- **Don't bypass `selectModel`.** Even for "just this one quick call" — every call goes through the tier system.
- **Don't put prompts in routes.** They go in `src/lib/ai/prompts/`.
- **Don't break mock mode.** New feature → new mock data, same shape as real.

## Reference

Full coding standards: `CODING_STANDARDS.md` at repo root.
