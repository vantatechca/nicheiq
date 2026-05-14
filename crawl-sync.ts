import { randomUUID } from "crypto";
import productHunt from "./src/lib/crawlers/product-hunt";
import envato from "./src/lib/crawlers/envato";
import { getDb } from "./src/lib/db/client";
import { signals, opportunities } from "./src/lib/db/schema";
import type { RawSignal } from "./src/lib/crawlers/types";

function classifyNiche(text: string): string {
  const t = text.toLowerCase();
  if (/notion/.test(t))                                return "notion_template";
  if (/excel|spreadsheet|google sheets/.test(t))       return "excel_template";
  if (/canva/.test(t))                                 return "canva_template";
  if (/figma/.test(t))                                 return "figma_kit";
  if (/discord\s?bot/.test(t))                         return "discord_bot";
  if (/wordpress|wp.plugin/.test(t))                   return "wordpress_theme";
  if (/shopify/.test(t))                               return "shopify_app";
  if (/micro.?saas|saas tool/.test(t))                 return "micro_saas";
  if (/game.asset|unity|unreal/.test(t))               return "game_asset";
  if (/printable|planner|tracker/.test(t))             return "etsy_printable";
  if (/ebook|handbook|guide/.test(t))                  return "gumroad_ebook";
  if (/kdp|kindle|low.content/.test(t))                return "kdp_low_content";
  if (/prompt.pack|gpt|midjourney/.test(t))            return "ai_prompt_pack";
  if (/lightroom|preset/.test(t))                      return "lightroom_preset";
  if (/procreate|brush/.test(t))                       return "procreate_brush";
  if (/browser.extension|chrome.ext/.test(t))          return "browser_extension";
  if (/svg|cut.file/.test(t))                          return "svg_cut_file";
  if (/resume|cv|hiring|recruitment/.test(t))          return "resume_template";
  if (/social.media|instagram|tiktok/.test(t))         return "social_media_template";
  if (/transitions/.test(t))                           return "video_template";
  if (/motion|after.effects|titles|lower.third/.test(t)) return "motion_graphic";
  if (/premiere|video.template/.test(t))               return "video_template";
  if (/drum.kit/.test(t))                              return "drum_kit";
  if (/sound.effect|audiojungle|music.pack/.test(t))   return "sound_effect_pack";
  if (/sample.pack|midi/.test(t))                      return "sample_pack";
  if (/music.loop/.test(t))                            return "music_loop_pack";
  if (/dataset|data.pack/.test(t))                     return "dataset";
  if (/course|mini.course|tutorial/.test(t))           return "mini_course";
  if (/swipe.file|script.pack|seo|blog/.test(t))       return "swipe_file";
  if (/airtable/.test(t))                              return "airtable_template";
  if (/pitch.deck/.test(t))                            return "pitch_deck_template";
  if (/powerpoint|slides/.test(t))                     return "powerpoint_template";
  if (/infographic/.test(t))                           return "social_media_template";
  if (/ai.agent|automation|workflow/.test(t))          return "ai_workflow_template";
  if (/meeting|notes|transcript/.test(t))              return "ai_workflow_template";
  if (/logo|branding/.test(t))                         return "brand_kit";
  if (/business.card/.test(t))                         return "business_card_template";
  if (/invoice|proposal/.test(t))                      return "invoice_template";
  if (/brochure|catalog/.test(t))                      return "mockup_template";
  if (/flyer|poster/.test(t))                          return "print_on_demand";
  if (/mockup/.test(t))                                return "mockup_template";
  if (/font|typeface/.test(t))                         return "font_bundle";
  if (/icon|illustration/.test(t))                     return "illustration_pack";
  if (/worksheet/.test(t))                             return "kids_worksheet";
  if (/template|kit|pack|bundle/.test(t))              return "notion_template";
  if (/saas|software|app|tool/.test(t))                return "micro_saas";
  if (/chrome|extension|plugin/.test(t))               return "browser_extension";
  if (/productivity|dashboard/.test(t))                return "notion_template";
  return "other";
}

function scoreSignal(title: string, snippet = "", sales = 0): number {
  const t = (title + " " + snippet).toLowerCase();
  let s = 55;
  if (/template|kit|pack|bundle/.test(t))           s += 12;
  if (/instant.download|digital.download/.test(t))  s += 10;
  if (/launch|released|introducing/.test(t))        s += 8;
  if (/\$\d+|\d+\s*usd/.test(t))                   s += 5;
  if (/trending|bestsell|popular/.test(t))           s += 5;
  if (/ai|automation|workflow/.test(t))              s += 5;
  if (/free|open.source/.test(t))                   s -= 8;
  if (/how to|learn/.test(t))                       s -= 5;
  if (sales > 10000)     s += 20;
  else if (sales > 1000) s += 15;
  else if (sales > 100)  s += 10;
  else if (sales > 10)   s += 5;
  return Math.min(Math.max(Math.round(s), 0), 100);
}

async function main() {
  const db = getDb();
  console.log("=== NicheIQ Crawl Sync ===\n");

  // ── Product Hunt ──
  console.log("Crawling Product Hunt...");
  const phRaw     = await productHunt.crawl({ config: { limit: 10 } });
  const phSignals = productHunt.normalize(productHunt.parse(phRaw));
  console.log(`  PH signals: ${phSignals.length}`);

  // ── Envato ──
  console.log("Crawling Envato...");
  const ENVATO_SEARCHES = [
    { site: "graphicriver.net",  term: "template"         },
    { site: "graphicriver.net",  term: "printable"        },
    { site: "graphicriver.net",  term: "social media"     },
    { site: "graphicriver.net",  term: "resume"           },
    { site: "graphicriver.net",  term: "branding"         },
    { site: "graphicriver.net",  term: "mockup"           },
    { site: "graphicriver.net",  term: "logo"             },
    { site: "graphicriver.net",  term: "invoice"          },
    { site: "graphicriver.net",  term: "business card"    },
    { site: "graphicriver.net",  term: "worksheet"        },
    { site: "graphicriver.net",  term: "spreadsheet"      },
    { site: "graphicriver.net",  term: "planner"          },
    { site: "graphicriver.net",  term: "infographic"      },
    { site: "graphicriver.net",  term: "pitch deck"       },
    { site: "graphicriver.net",  term: "icon pack"        },
    { site: "graphicriver.net",  term: "font"             },
    { site: "graphicriver.net",  term: "illustration"     },
    { site: "graphicriver.net",  term: "brush"            },
    { site: "graphicriver.net",  term: "lightroom preset" },
    { site: "videohive.net",     term: "template"         },
    { site: "videohive.net",     term: "intro"            },
    { site: "videohive.net",     term: "transitions"      },
    { site: "videohive.net",     term: "motion graphic"   },
    { site: "videohive.net",     term: "titles"           },
    { site: "audiojungle.net",   term: "music pack"       },
    { site: "audiojungle.net",   term: "sound effects"    },
    { site: "audiojungle.net",   term: "drum kit"         },
  ];

  const envatoSignals: RawSignal[] = [];
  for (const search of ENVATO_SEARCHES) {
    try {
      const raw  = await envato.crawl({ config: { ...search, sortBy: "trending" } });
      const sigs = envato.normalize(envato.parse(raw));
      envatoSignals.push(...sigs);
      await new Promise((r) => setTimeout(r, 400));
    } catch {
      console.warn(`  Envato ${search.site}/${search.term} skipped`);
    }
  }
  console.log(`  Envato signals: ${envatoSignals.length}`);

  const allSignals: RawSignal[] = [...phSignals, ...envatoSignals];
  console.log(`Total raw signals: ${allSignals.length}\n`);

  // ── Persist signals ──
  let inserted = 0;
  let skipped  = 0;
  const newSignalIds: string[]    = [];
  const newSignals:   RawSignal[] = [];

  for (const sig of allSignals) {
    const text  = sig.title + " " + (sig.snippet ?? "") + " " + (sig.tags ?? []).join(" ");
    const niche = classifyNiche(text);
    if (niche === "other") { skipped++; continue; }

    const sales = sig.estMonthlySales?.high ?? 0;
    const score = scoreSignal(sig.title, sig.snippet, sales);
    if (score < 55) { skipped++; continue; }

    const id = randomUUID();
    try {
      await db.insert(signals).values({
        id,
        signalType:     "marketplace_listing",
        sourcePlatform: sig.sourcePlatform as any,
        sourceUrl:      sig.sourceUrl,
        sourceId:       sig.sourceId,
        niche:          niche as any,
        title:          sig.title,
        snippet:        sig.snippet ?? "",
        engagement:     { score, sales },
        score,
        processedAt:    new Date(),
        ideaIdsLinked:  [],
      });
      newSignalIds.push(id);
      newSignals.push(sig);
      inserted++;
      console.log(`  ✓ [${niche}] ${sig.title.slice(0, 55)} — $${sig.priceUsd ?? 0} (${sales} sales)`);
    } catch {
      skipped++;
    }
  }

  console.log(`\nSignals — inserted: ${inserted} | skipped: ${skipped}`);

  if (newSignals.length === 0) {
    console.log("No new signals — done.");
    process.exit(0);
  }

  // ── Synthesize opportunities ──
  console.log("\nSynthesizing opportunities...");
  const byNiche = new Map<string, Array<{ sig: RawSignal; id: string; sales: number }>>();

  for (let i = 0; i < newSignals.length; i++) {
    const sig   = newSignals[i]!;
    const id    = newSignalIds[i]!;
    const niche = classifyNiche(sig.title + " " + (sig.snippet ?? ""));
    const sales = sig.estMonthlySales?.high ?? 0;
    const group = byNiche.get(niche) ?? [];
    group.push({ sig, id, sales });
    byNiche.set(niche, group);
  }

  let oppsCreated = 0;

  for (const [niche, group] of byNiche) {
    const sorted   = group.sort((a, b) => b.sales - a.sales || scoreSignal(b.sig.title) - scoreSignal(a.sig.title));
    const best     = sorted[0]!;
    const oppScore = scoreSignal(best.sig.title, best.sig.snippet, best.sales);
    if (oppScore < 55) continue;

    try {
      await db.insert(opportunities).values({
        id:                  randomUUID(),
        title:               best.sig.title,
        summary:             best.sig.snippet ?? best.sig.title,
        niche:               niche as any,
        opportunityType:     "replication",
        buildEffort:         "weekend",
        projectedRevenueUsd: (best.sig.priceUsd ?? 10) * Math.min(best.sales, 100),
        status:              "tracking",
        sourceProductIds:    [],
        sourceSignalIds:     group.map((g) => g.id),
        aiRationale:         `Top signal: "${best.sig.title}" — ${best.sales} sales at $${best.sig.priceUsd} on ${best.sig.sourcePlatform}.`,
        aiBuildPlan:         {},
        score:               oppScore,
        scoreBreakdown:      { base: 55, sales: best.sales, signals: oppScore - 55 },
        createdBy:           "crawl-sync",
        createdAt:           new Date(),
        updatedAt:           new Date(),
      });
      oppsCreated++;
      console.log(`  ✓ [${niche}] ${best.sig.title.slice(0, 50)} (score: ${oppScore})`);
    } catch { /* skip duplicates */ }
  }

  console.log(`\nOpportunities created: ${oppsCreated}`);
  console.log("=== Done ===");
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });