import type { CrawlerModule, RawSignal } from "./types";
import type { SourcePlatform } from "@/lib/utils/constants";

export function makeStub(platform: SourcePlatform, opts?: { requiresHeadless?: boolean }): CrawlerModule {
  return {
    source: platform,
    requiresHeadless: opts?.requiresHeadless ?? false,
    async crawl() {
      throw new Error(`Crawler for ${platform} not implemented yet — Phase I will wire it.`);
    },
    parse() {
      return [];
    },
    normalize(): RawSignal[] {
      return [];
    },
  };
}
