import { crawlSource } from "./crawl-source";
import { enrichProduct } from "./enrich-product";
import { scoreOpportunity } from "./score-opportunity";
import { synthesizeOpportunities } from "./synthesize-opportunities";
import { generateDigestDaily, generateDigestWeekly } from "./generate-digest";
import { snapshotTrends } from "./snapshot-trends";
import { refreshPatterns } from "./refresh-patterns";
import { scanFlippa } from "./scan-flippa";
import { crawlReddit } from "./crawl-reddit";
import { crawlProductHunt } from "./crawl-product-hunt";
import { crawlHackerNews } from "./crawl-hacker-news";
import { crawlEnvato } from "./crawl-envato";
import { crawlKaggle } from "./crawl-kaggle";
import { crawlEtsy } from "./crawl-etsy";
import { deepDiveCreator } from "./deep-dive-creator";

// NOTE: crawlGumroad is intentionally NOT registered — Gumroad has no usable
// official discovery API and would only work via ToS-violating scraping, which
// we deliberately don't do. crawlEtsy IS registered: it runs through a licensed
// Apify actor (not raw scraping), so it's on the same footing as the other
// crawlers. Its file can stay dormant only if removed from this array.

export const allFunctions = [
  crawlSource,
  enrichProduct,
  scoreOpportunity,
  synthesizeOpportunities,
  generateDigestDaily,
  generateDigestWeekly,
  snapshotTrends,
  refreshPatterns,
  scanFlippa,
  crawlReddit,
  crawlProductHunt,
  crawlHackerNews,
  crawlEnvato,
  crawlKaggle,
  crawlEtsy,
  deepDiveCreator,
];