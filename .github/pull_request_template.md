## What

<!-- What changed in this PR? One or two sentences. -->

## Why

<!-- Why this change? Link to issue / context if any. -->

## Test plan

<!-- How did you verify it works? -->

- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] `npm test` passes
- [ ] Manual smoke test in mock mode (`USE_MOCK=true npm run dev`)
- [ ] Manual smoke test against real DB (if DB schema or query changed)

## Screenshots / video

<!-- Required for any UI change. Delete this section otherwise. -->

## Checklist

- [ ] Follows `AGENTS.md` conventions (no inline prompts, no bypassed `selectModel`, no broken mock mode)
- [ ] New env vars added to `.env.local.example` with comments
- [ ] New mock data added if a new feature needs it
- [ ] Migration committed (if schema changed) and tested locally
- [ ] No secrets, payment data, or auth tokens in logs
