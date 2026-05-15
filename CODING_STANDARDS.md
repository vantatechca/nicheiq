# Coding Standards

> For Next.js 14 + TypeScript data & AI platforms. Distilled from patterns running in `nicheiq` and `research-a`. Use as a gate for new repos and a periodic audit for existing ones.

---

## ⚠ Decision pending: pick one ORM

`nicheiq` uses **Drizzle** (Neon proxy, pgvector). `research-a` uses **Prisma**. Both work, but cross-repo work pays a cognitive tax.

**Recommendation:** Drizzle is the default for new repos — better edge-runtime story, lighter, matches the existing Neon/Inngest stack. Keep Prisma in `research-a`; don't start new repos with it unless there's a specific reason.

---

## 1. Foundations

- [ ] `tsconfig.json` has `"strict": true` and `"noUncheckedIndexedAccess": true`
- [ ] ESLint + Prettier configured; CI fails on lint errors
- [ ] `.env.local.example` lists every key with comments, no values — it IS the env contract
- [ ] `.env.local`, `.env.production`, all secrets in `.gitignore`
- [ ] `USE_MOCK=true` (or equivalent) default for local dev — app boots with no external service
- [ ] `.npmrc` committed if legacy peer deps required (NextAuth v4 + React 18, etc.)
- [ ] Path aliases configured: `@/lib`, `@/components`, `@/app` — no `../../../` imports
- [ ] Node version pinned (`.nvmrc` or `engines` in `package.json`)
- [ ] All package scripts documented in README under "Commands"
- [ ] One lockfile only (`package-lock.json`); no mixed `yarn.lock` / `pnpm-lock.yaml`

## 2. Folder Structure

```
src/
├── app/
│   ├── (auth)/            # login, signup — public group
│   ├── (dashboard)/       # protected routes
│   └── api/               # REST + SSE routes
├── components/
│   ├── ui/                # shadcn primitives — never edit
│   ├── layout/            # sidebar, topbar, theme toggle
│   └── shared/            # KPI cards, charts, badges
├── lib/
│   ├── ai/                # tiered client, prompts, schemas
│   ├── api/               # response helpers
│   ├── auth/              # NextAuth options, session helpers
│   ├── crawlers/          # per-source modules + registry
│   ├── db/                # schema, client, seed
│   ├── hooks/             # use-sse, use-debounced
│   ├── redis/             # Upstash client + ratelimit factory
│   ├── types/             # shared TS types
│   └── utils/             # format, validation, constants
├── inngest/               # OR workers/ — pick one per repo
├── mock/                  # mirrors real shapes 1:1
└── middleware.ts
```

- [ ] All non-UI logic under `src/lib/`; components import from lib, never the reverse
- [ ] shadcn primitives in `components/ui/` are never edited — they're regenerable
- [ ] Route groups (`(auth)`, `(dashboard)`) used to share layouts
- [ ] File naming: kebab-case files, PascalCase React components
- [ ] Mock data in `src/mock/` mirrors real schema shapes 1:1
- [ ] Migrations dir (`drizzle/` or `prisma/migrations/`) committed
- [ ] E2E tests in `tests/e2e/`, unit tests colocated as `*.test.ts`

## 3. TypeScript

- [ ] No `any`. Use `unknown` and narrow with Zod or type guards
- [ ] Zod schemas for: API route bodies, external API responses, AI model outputs
- [ ] Type-only imports use `import type { Foo } from '...'`
- [ ] `interface` for object shapes likely to extend; `type` for unions and aliases
- [ ] NextAuth augmentation (and other module augments) in `src/lib/types/`
- [ ] No `@ts-ignore` — use `@ts-expect-error` with a reason
- [ ] `npm run typecheck` runs in CI on every PR

## 4. Database Layer

- [ ] One ORM per repo (Drizzle preferred for new repos)
- [ ] Schema in single source: `src/lib/db/schema.ts` (Drizzle) or `prisma/schema.prisma`
- [ ] All DB access through one client file — centralized pooling, logging, tracing
- [ ] Migrations committed and **never edited after merge**
- [ ] Scripts present: `db:generate`, `db:migrate`, `db:seed` — documented in README
- [ ] Seed data idempotent (safe to re-run)
- [ ] Connection pooling enabled (Neon proxy / Prisma Accelerate / pgBouncer)
- [ ] pgvector set up at schema level if AI embeddings used

## 5. API Routes

Standardized response envelope:

```ts
// src/lib/api/response.ts
export const ok = <T>(data: T) => Response.json({ ok: true, data });
export const fail = (error: string, status = 400) =>
  Response.json({ ok: false, error }, { status });
```

- [ ] `{ ok: true, data }` / `{ ok: false, error }` response shape everywhere
- [ ] Zod-validate the request body **before** any business logic
- [ ] Every public route rate-limited via `@upstash/ratelimit`
- [ ] Auth via `getServerSession` or middleware redirect — no route relies on caller honesty
- [ ] Webhook endpoints validate HMAC signatures from per-source env vars (bridge pattern)
- [ ] SSE on edge runtime; standard runtime for DB-heavy routes
- [ ] Errors logged with request context (route, user id, payload hash) — **never the raw payload**
- [ ] No business logic in route files — delegate to `src/lib/` modules

## 6. Authentication

- [ ] NextAuth v4+ with JWT strategy (DB sessions only if multi-device revocation required)
- [ ] Credentials hashed with bcrypt or argon2 — never plaintext
- [ ] `src/middleware.ts` protects the `(dashboard)` group
- [ ] Server-component session helper in `src/lib/auth/session.ts`
- [ ] Seat limits enforced server-side (not just in UI)
- [ ] `NEXTAUTH_SECRET` unique per environment

## 7. AI Integration

```ts
import { selectModel } from "@/lib/ai/client";

const tier3 = selectModel({ tier: 3 });
for await (const chunk of tier3.stream({
  system: assembleContext({ mode: "global", userId }),
  messages: [{ role: "user", content: prompt }],
}))
  yield chunk;
```

- [ ] Tiered model selection: cheap (Qwen via OpenRouter) → mid (Claude Haiku) → premium (Claude Sonnet)
- [ ] `selectModel({ tier })` factory — callers never reference a provider directly
- [ ] Daily spend cap enforced via Upstash counter — tier-3 refuses above cap
- [ ] Context assembled in dedicated module (`src/lib/ai/context-assembler.ts`)
- [ ] Prompts in dedicated files under `src/lib/ai/prompts/` — never inlined
- [ ] Zod schemas validate structured model output
- [ ] Streaming for user-facing chat; non-streaming for background tasks
- [ ] All AI API keys env-only — never hardcoded, never logged

## 8. Background Jobs

- [ ] Inngest for new repos (durable, typed, observable); existing `workers/` patterns OK
- [ ] One function per file under `src/inngest/functions/`
- [ ] Functions synced to Inngest after deploy via CLI — documented in README
- [ ] Cron jobs use idempotency keys to survive retries
- [ ] Long-running jobs report progress to Redis or DB — never silent
- [ ] Job names use stable prefix (`crawl.`, `digest.`, `email.`) for dashboard filtering

## 9. Crawlers & Sources

- [ ] Registry: `src/lib/crawlers/registry.ts` maps `sourcePlatform` → `CrawlerModule`
- [ ] Each crawler exports the same typed contract: `crawl(input) => Promise<CrawlResult[]>`
- [ ] Credential-less sources first: Reddit JSON, HN, Product Hunt GraphQL, Kaggle, Envato
- [ ] ToS-sensitive sources (Etsy, Gumroad, Creative Market, Notion marketplace) routed through Apify / ScrapingBee / Bright Data — never direct
- [ ] Every crawler has a mock implementation — registry resolves to mocks under `USE_MOCK=true`
- [ ] Rate limit and backoff inside the crawler module, not the caller
- [ ] Output rows validated by Zod before insert

## 10. Frontend

- [ ] shadcn/ui primitives in `components/ui/` stay untouched (regenerable)
- [ ] Tailwind utility classes — no `style={{}}` except for dynamic values
- [ ] Recharts for charts, lucide-react for icons — no mixing icon libraries
- [ ] Every async UI has a loading state (skeletons, not spinners)
- [ ] Every list has an explicit empty-state component — never "No data"
- [ ] Mobile-first: components work at 360px before they work at 1440px
- [ ] Theme toggle in any dashboard product (dark/light)
- [ ] Forms use react-hook-form + Zod resolver — same Zod schema as the API route

## 11. Testing

- [ ] Vitest unit tests for: scoring engines, validators, AI output parsers, pure utilities
- [ ] Playwright: one happy-path E2E per app — login → core action → result
- [ ] Unit tests colocated next to source: `foo.ts` + `foo.test.ts`
- [ ] CI runs typecheck + lint + unit tests on every PR; E2E on main
- [ ] Tests use mock data — never hit real DB or external APIs in CI
- [ ] Failing test blocks merge (branch protection rule)

## 12. Security

- [ ] Secrets never committed; `.env.local.example` is the contract
- [ ] Webhooks validate HMAC signatures, per-source env vars (bridge pattern)
- [ ] Rate limits on every public endpoint — anonymous tier + authenticated tier
- [ ] Zod validates input before any logic
- [ ] No `dangerouslySetInnerHTML` unless content is sanitized AND code-reviewed
- [ ] Dependencies audited (`npm audit`) before deploy; lockfile committed
- [ ] Cookies: `httpOnly`, `secure` in prod, `SameSite=lax` minimum
- [ ] Never log payment data, full webhook bodies, or auth tokens — even in dev
- [ ] CORS allowlist explicit — no `*` on authenticated endpoints

## 13. Git & Pull Requests

- [ ] Conventional commits: `feat:`, `fix:`, `chore:`, `refactor:`, `docs:`, `test:`
- [ ] Branches named `feature/short-description` or `phase-a-foundation`
- [ ] One commit per logical unit; squash on merge to main
- [ ] PR description: what, why, test plan, screenshots for UI changes
- [ ] Branch protection on `main`: PR required, status checks must pass
- [ ] `.gitignore` covers `.env*`, `node_modules`, `.next`, IDE files, OS files
- [ ] No force-push to `main`, ever

## 14. Documentation

- [ ] `README.md` sections: description, Quick Start (3 commands max), Stack table, Folder map, Commands, Deploy steps
- [ ] Quick Start gets a teammate to `localhost:3000` in under 5 minutes with mock mode
- [ ] `AGENTS.md` at repo root with framework quirks, deprecation warnings, and "this is NOT what your training data thinks" notes
- [ ] `CLAUDE.md` is `@AGENTS.md` (single-line pointer) so both naming conventions resolve
- [ ] Inline JSDoc only on public exports of `src/lib/` — keep route handlers and components clean
- [ ] Build phases tracked in git log with phase labels for greenfield repos
- [ ] Architecture diagrams (Excalidraw / Mermaid) for cross-system flows — bridges, payment routing, crawler pipelines

---

_Revise quarterly. Last update: May 2026._
