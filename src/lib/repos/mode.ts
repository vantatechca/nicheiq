/**
 * Single source of truth for mock-vs-live mode. Routes should never read
 * USE_MOCK directly — go through repos in `@/lib/repos/*` which call this.
 *
 * The default is mock (true). Setting USE_MOCK=false flips every read path
 * onto the real database; writes that target Inngest events behave the same
 * way (the dispatch is real either way, but in live mode targets real workers).
 */
export function isMockMode(): boolean {
  return process.env.USE_MOCK !== "false";
}
