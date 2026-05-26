/**
 * Canonical niche classification — the single source of truth shared by every
 * crawl path.
 *
 * Previously there were two independent classifiers that could disagree:
 *   - a regex/keyword map in inngest/functions/crawl-source.ts (products), and
 *   - a subreddit map + AI prompt in inngest/functions/_persist-signals.ts
 *     (signals), whose prompt hinted `chatgpt_prompt_pack` for r/ChatGPT while
 *     the map assigned `ai_prompt_pack`.
 *
 * Both now import from here, so the deterministic mapping and the AI prompt's
 * hint examples are derived from the same tables and cannot drift.
 */
import { nicheEnum } from "@/lib/db/schema";

export type NicheValue = (typeof nicheEnum.enumValues)[number];

const VALID_NICHES = new Set<NicheValue>(nicheEnum.enumValues);

/** Coerce an arbitrary string to a valid niche, falling back to "other". */
export function safeNiche(v: string): NicheValue {
  return VALID_NICHES.has(v as NicheValue) ? (v as NicheValue) : "other";
}

/**
 * Subreddit → niche direct mapping. Used both as a deterministic hint in
 * `inferNiche` and to generate the AI classifier's per-item HINT lines, so the
 * two stay in lockstep. (r/ChatGPT, r/MidJourney, r/AIPromptEngineering all map
 * to `ai_prompt_pack` — pick the more specific `chatgpt_prompt_pack` here if you
 * want ChatGPT-specific prompts bucketed separately; just change it in one place.)
 */
export const SUBREDDIT_NICHE: Record<string, NicheValue> = {
  Notion: "notion_template",
  NotionTemplates: "notion_template",
  EtsySellers: "etsy_printable",
  Etsy: "etsy_printable",
  KDP: "kdp_low_content",
  selfpublishing: "kdp_low_content",
  lightroom: "lightroom_preset",
  gamedev: "game_asset",
  gamedesign: "game_asset",
  discordapp: "discord_bot",
  WordpressPlugins: "wordpress_theme",
  shopify: "shopify_app",
  VideoEditing: "video_template",
  datasets: "dataset",
  ChatGPT: "ai_prompt_pack",
  MidJourney: "ai_prompt_pack",
  AIPromptEngineering: "ai_prompt_pack",
  NoCode: "micro_saas",
  nocode: "micro_saas",
  microsaas: "micro_saas",
  SaaS: "micro_saas",
};

/**
 * Keyword/regex patterns over title + tags + snippet. Order matters — the first
 * match wins. (Formerly duplicated in crawl-source.ts.)
 */
export const NICHE_PATTERNS: Array<[RegExp, NicheValue]> = [
  [/canva/i, "canva_template"],
  [/notion/i, "notion_template"],
  [/procreate/i, "procreate_brush"],
  [/lightroom/i, "lightroom_preset"],
  [/svg|cut.?file/i, "svg_cut_file"],
  [/resume|cv/i, "resume_template"],
  [/planner/i, "planner_printable"],
  [/printable/i, "etsy_printable"],
  [/social.?media/i, "social_media_template"],
  [/instagram/i, "instagram_template"],
  [/excel|spreadsheet/i, "excel_template"],
  [/powerpoint|slides/i, "powerpoint_template"],
  [/google.?sheets/i, "google_sheets_template"],
  [/budget|finance/i, "budget_tracker"],
  [/habit/i, "habit_tracker"],
  [/meal/i, "meal_planner"],
  [/fitness|workout/i, "fitness_planner"],
  [/invoice/i, "invoice_template"],
  [/email.?template/i, "email_template"],
  [/logo/i, "logo_template"],
  [/font/i, "font_bundle"],
  [/icon/i, "icon_pack"],
  [/mockup/i, "mockup_template"],
  [/figma/i, "figma_kit"],
  [/prompt|gpt|ai/i, "ai_prompt_pack"],
  [/wedding/i, "wedding_printable"],
  [/kids|children/i, "kids_activity_printable"],
  [/coloring/i, "coloring_page"],
  [/sticker/i, "sticker_sheet"],
  [/journal/i, "journal_template"],
  [/ebook/i, "gumroad_ebook"],
  [/course/i, "course"],
];

export interface NicheInferInput {
  title?: string;
  tags?: string[];
  snippet?: string;
  /** Explicit niche supplied by the crawler, if any. */
  niche?: string | null;
}

/**
 * Deterministic niche classifier shared by every crawl path. Precedence:
 *   1. an explicit `niche` from the crawler (validated against the enum)
 *   2. a subreddit hint (first tag) via SUBREDDIT_NICHE
 *   3. a keyword/regex match over title + tags + snippet
 *   4. "other"
 *
 * `products.niche` and `signals.niche` are both NOT NULL, so this always
 * returns a valid enum value.
 */
export function inferNiche(input: NicheInferInput): NicheValue {
  if (input.niche) return safeNiche(input.niche);

  const sub = input.tags?.[0];
  if (sub && SUBREDDIT_NICHE[sub]) return SUBREDDIT_NICHE[sub];

  const haystack = [input.title ?? "", ...(input.tags ?? []), input.snippet ?? ""]
    .join(" ")
    .toLowerCase();
  for (const [pattern, niche] of NICHE_PATTERNS) {
    if (pattern.test(haystack)) return niche;
  }
  return "other";
}

/** The subreddit-derived niche hint for a tag, if any (used by the AI prompt). */
export function subredditHintFor(subreddit: string | undefined): NicheValue | undefined {
  return subreddit ? SUBREDDIT_NICHE[subreddit] : undefined;
}