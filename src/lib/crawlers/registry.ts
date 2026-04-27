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
  gumroad: gumroad.default,
};

export function getCrawler(platform: string): CrawlerModule | null {
  return CRAWLERS[platform] ?? null;
}
