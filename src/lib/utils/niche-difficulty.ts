// Clone/reproduction difficulty per niche — "how hard is it to make a competing
// version of this kind of product." This is the axis the boss asked for
// ("easier niches than others… depending on if it's hard to reproduce the
// content"). It's distinct from buildEffort: a Notion template and a micro-SaaS
// can both be "a week" of work but are worlds apart to actually clone.
//
// Single source of truth, mirrored from nicheiq_two_databases.sql. Tune here.

export type CloneDifficulty = "easy" | "medium" | "hard";

// Pure files: a template / printable / design / prompt asset. Fastest to clone.
const EASY = new Set<string>([
  "notion_template",
  "excel_template",
  "google_sheets_template",
  "airtable_template",
  "powerpoint_template",
  "google_slides_template",
  "clickup_template",
  "trello_template",
  "etsy_printable",
  "wedding_printable",
  "party_printable",
  "holiday_printable",
  "kids_activity_printable",
  "homeschool_printable",
  "coloring_page",
  "sticker_sheet",
  "planner_printable",
  "budget_tracker",
  "habit_tracker",
  "meal_planner",
  "fitness_planner",
  "travel_planner",
  "content_calendar",
  "project_planner",
  "resume_template",
  "social_media_template",
  "instagram_template",
  "canva_template",
  "youtube_thumbnail",
  "tiktok_template",
  "newsletter_template",
  "brand_kit",
  "logo_template",
  "icon_pack",
  "mockup_template",
  "font_bundle",
  "color_palette",
  "svg_cut_file",
  "lightroom_preset",
  "ai_prompt_pack",
  "chatgpt_prompt_pack",
  "midjourney_prompt_pack",
  "checklist_pack",
  "journal_template",
  "planner_book",
  "kdp_low_content",
  "educational_poster",
  "goal_setting_workbook",
  "invoice_template",
  "business_card_template",
  "email_template",
]);

// Needs real production work, but no code/data moat to overcome.
const MEDIUM = new Set<string>([
  "figma_kit",
  "procreate_brush",
  "photoshop_action",
  "illustration_pack",
  "print_on_demand",
  "sublimation_design",
  "embroidery_design",
  "clipart_pack",
  "pattern_design",
  "sample_pack",
  "midi_pack",
  "drum_kit",
  "sound_effect_pack",
  "music_loop_pack",
  "video_template",
  "video_lut",
  "motion_graphic",
  "youtube_banner",
  "intro_template",
  "gumroad_ebook",
  "mini_course",
  "workbook",
  "swipe_file",
  "study_guide",
  "flashcard_pack",
  "language_learning",
  "recipe_collection",
  "wedding_planner_kit",
  "event_planner_kit",
  "kids_worksheet",
  "plr_pack",
  "plr_articles",
  "plr_social_posts",
  "contract_template",
  "sop_template",
  "business_plan_template",
  "pitch_deck_template",
  "crm_template",
  "course",
]);

/**
 * Everything not explicitly easy/medium is "hard" — the code/data/defensible
 * builds (micro_saas, shopify_app, browser_extension, discord_bot,
 * wordpress_theme, game/unity assets, datasets, financial_model, website
 * templates, etc.). Defaulting unknown niches to "hard" is the safe direction:
 * it won't over-promise an easy clone.
 */
export function cloneDifficulty(niche: string): CloneDifficulty {
  if (EASY.has(niche)) return "easy";
  if (MEDIUM.has(niche)) return "medium";
  return "hard";
}