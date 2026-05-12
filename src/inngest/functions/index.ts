import { crawlSource } from "./crawl-source";
import { enrichProduct } from "./enrich-product";
import { scoreOpportunity } from "./score-opportunity";
import { synthesizeOpportunities } from "./synthesize-opportunities";
import { generateDigestDaily, generateDigestWeekly } from "./generate-digest";
import { snapshotTrends } from "./snapshot-trends";
import { refreshPatterns } from "./refresh-patterns";
import { scanFlippa } from "./scan-flippa";
import { crawlReddit } from "./crawl-reddit";
import { crawlEtsy } from "./crawl-etsy";
import { crawlProductHunt } from "./crawl-product-hunt";
import { crawlHackerNews } from "./crawl-hacker-news";
import { deepDiveCreator } from "./deep-dive-creator";

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
  crawlEtsy,
  crawlProductHunt,
  crawlHackerNews,
  deepDiveCreator,
];