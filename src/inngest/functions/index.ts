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
import { deepDiveCreator } from "./deep-dive-creator";

// NOTE: crawlEtsy and crawlGumroad are intentionally NOT registered.
// Etsy API access is denied for this account and Gumroad has no usable
// official discovery API — both would only work via ToS-violating scraping,
// which we deliberately don't do. Their function files can stay in the repo
// (dormant) but must not be scheduled, or Inngest will fire failing jobs.

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
  deepDiveCreator,
];