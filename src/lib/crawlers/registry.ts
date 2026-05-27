import type { CrawlerModule } from "./types";
import * as envato from "./envato";
import * as reddit from "./reddit";
import * as productHunt from "./product-hunt";
import * as hackerNews from "./hacker-news";
import * as kaggle from "./kaggle";
import * as etsy from "./etsy";
import * as gumroad from "./gumroad";

export const CRAWLERS: Partial<Record<string, CrawlerModule>> = {
  envato: envato.default,
  reddit: reddit.default,
  product_hunt: productHunt.default,
  hacker_news: hackerNews.default,
  kaggle: kaggle.default,
  etsy: etsy.default,
  // gumroad: hits an unofficial endpoint with no discovery API — ToS-sensitive.
  // Left disabled to match the Inngest index note. Re-enable only with that risk
  // accepted. (See the earlier punch-list, item 2.)
  // gumroad: gumroad.default,
};

export function getCrawler(platform: string): CrawlerModule | null {
  return CRAWLERS[platform] ?? null;
}