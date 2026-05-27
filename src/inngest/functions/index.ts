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
import { crawlGumroad } from "./crawl-gumroad";
import { deepDiveCreator } from "./deep-dive-creator";

// NOTE: crawlGumroad now runs through a licensed Apify actor (same footing as
// crawlEtsy) instead of the old direct gumroad.com/discover_search scrape, so
// it is registered below. It needs APIFY_TOKEN set; the actor is overridable
// via GUMROAD_APIFY_ACTOR. crawlEtsy likewise runs through an Apify actor (not
// raw scraping). A crawler file only stays dormant if removed from this array.

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
  crawlGumroad,
  deepDiveCreator,
];