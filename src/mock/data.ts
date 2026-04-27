import type {
  ActivityEntry,
  BuildPlan,
  Competitor,
  Conversation,
  Creator,
  CreatorPlaybook,
  DashboardKpis,
  Digest,
  FeedbackPattern,
  GoldenRule,
  Message,
  Niche,
  Opportunity,
  Product,
  ResellableAsset,
  ScoreBreakdown,
  Signal,
  Source,
  Trend,
} from "@/lib/types";
import type { NicheValue, SourcePlatform } from "@/lib/utils/constants";
import { NICHE_LIST } from "@/lib/utils/constants";

const NOW = new Date("2026-04-26T19:40:00Z");
const isoMinusDays = (d: number, h = 0) =>
  new Date(NOW.getTime() - d * 86_400_000 - h * 3_600_000).toISOString();
const isoMinusHours = (h: number) => new Date(NOW.getTime() - h * 3_600_000).toISOString();

// Deterministic seeded float in [0, 1)
function det(seed: number) {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}
const pick = <T>(arr: readonly T[], seed: number): T => arr[Math.floor(det(seed) * arr.length) % arr.length] as T;
const randInt = (seed: number, min: number, max: number) => Math.floor(det(seed) * (max - min + 1)) + min;
const randFloat = (seed: number, min: number, max: number) => det(seed) * (max - min) + min;

// ----------------------------- Users -----------------------------

export const mockUsers = [
  {
    id: "user_andrei",
    email: "andrei@nicheiq.com",
    name: "Andrei Dutescu",
    role: "admin" as const,
    avatarUrl: "https://i.pravatar.cc/150?img=68",
    passwordHashRef: "nicheiq123",
    createdAt: isoMinusDays(180),
  },
  {
    id: "user_editor",
    email: "editor@nicheiq.com",
    name: "Maya Editor",
    role: "editor" as const,
    avatarUrl: "https://i.pravatar.cc/150?img=47",
    passwordHashRef: "nicheiq123",
    createdAt: isoMinusDays(120),
  },
  {
    id: "user_viewer",
    email: "viewer@nicheiq.com",
    name: "Sam Viewer",
    role: "viewer" as const,
    avatarUrl: "https://i.pravatar.cc/150?img=12",
    passwordHashRef: "nicheiq123",
    createdAt: isoMinusDays(45),
  },
  {
    id: "user_demo",
    email: "demo@nicheiq.com",
    name: "Demo Account",
    role: "viewer" as const,
    avatarUrl: "https://i.pravatar.cc/150?img=33",
    passwordHashRef: "nicheiq123",
    createdAt: isoMinusDays(7),
  },
];

export type MockUser = (typeof mockUsers)[number];

// ----------------------------- Niches -----------------------------

const nicheDescriptions: Record<NicheValue, { description: string; iconKey: string }> = {
  print_on_demand: { description: "T-shirts, mugs, posters fulfilled by Printful/Printify networks.", iconKey: "shirt" },
  etsy_printable: { description: "Instant-download printables sold on Etsy: planners, art, invites.", iconKey: "printer" },
  notion_template: { description: "Productivity, OS, and CRM templates for Notion.", iconKey: "notion" },
  gumroad_ebook: { description: "Self-published ebooks distributed via Gumroad.", iconKey: "book" },
  kdp_low_content: { description: "Low-content books on KDP: journals, planners, notebooks.", iconKey: "notebook" },
  course: { description: "Recorded video courses and cohort programs.", iconKey: "graduation-cap" },
  ai_prompt_pack: { description: "Curated prompts for ChatGPT/Claude/Midjourney workflows.", iconKey: "sparkles" },
  figma_kit: { description: "Figma component libraries and UI kits.", iconKey: "figma" },
  wordpress_theme: { description: "Premium WordPress themes and Gutenberg blocks.", iconKey: "wordpress" },
  shopify_app: { description: "Shopify apps and embedded extensions.", iconKey: "store" },
  lightroom_preset: { description: "Lightroom and mobile photo presets sold as packs.", iconKey: "camera" },
  sample_pack: { description: "Audio sample packs, drum kits, MIDI loops for producers.", iconKey: "music" },
  video_template: { description: "After Effects, Premiere, DaVinci motion templates.", iconKey: "film" },
  dataset: { description: "Cleaned datasets ready for analysis or ML training.", iconKey: "database" },
  plr_pack: { description: "Private-label rights bundles you can rebrand and resell.", iconKey: "package" },
  micro_saas: { description: "Single-purpose SaaS tools under $50 ARR per user.", iconKey: "zap" },
  browser_extension: { description: "Chrome/Firefox extensions sold as productivity boosters.", iconKey: "puzzle" },
  discord_bot: { description: "Discord bots monetized via paid tiers or installs.", iconKey: "bot" },
  game_asset: { description: "2D sprites, 3D models, sound effects for game devs.", iconKey: "joystick" },
  other: { description: "Other digital opportunities outside the named niches.", iconKey: "more-horizontal" },
};

export const mockNiches: Niche[] = NICHE_LIST.map((n, i) => ({
  id: `niche_${n.value}`,
  slug: n.value,
  label: n.label,
  description: nicheDescriptions[n.value].description,
  parentId: null,
  iconKey: nicheDescriptions[n.value].iconKey,
  productCount: 0, // recomputed below
  opportunityCount: 0,
  momentumScore: Math.round(45 + det(i + 1) * 50),
}));

// ----------------------------- Source platforms (subset) -----------------------------

const platformList: SourcePlatform[] = [
  "etsy",
  "gumroad",
  "creative_market",
  "envato",
  "design_bundles",
  "kdp",
  "shopify_app_store",
  "notion_marketplace",
  "whop",
  "patreon",
  "skool",
  "teachers_pay_teachers",
  "lemonsqueezy",
];

// ----------------------------- Creators -----------------------------

const creatorNames = [
  ["printable_atelier", "Printable Atelier"],
  ["notion_north", "Notion North"],
  ["lofi_vault", "Lofi Vault"],
  ["preset_palace", "Preset Palace"],
  ["kdp_kingdom", "KDP Kingdom"],
  ["figma_friction", "Figma Friction"],
  ["promptcraft_pro", "Promptcraft Pro"],
  ["ebook_engine", "Ebook Engine"],
  ["theme_throne", "Theme Throne"],
  ["microsaas_mick", "MicroSaaS Mick"],
  ["sample_summit", "Sample Summit"],
  ["bot_bazaar", "Bot Bazaar"],
  ["dataset_depot", "Dataset Depot"],
  ["plr_press", "PLR Press"],
  ["course_compass", "Course Compass"],
  ["preset_collective", "Preset Collective"],
  ["etsy_aurora", "Etsy Aurora"],
  ["gum_gladiator", "Gum Gladiator"],
  ["creative_caravan", "Creative Caravan"],
  ["video_voyager", "Video Voyager"],
  ["whop_warrior", "Whop Warrior"],
  ["patreon_pioneer", "Patreon Pioneer"],
  ["skool_strategist", "Skool Strategist"],
  ["teach_titan", "Teach Titan"],
  ["lemon_lab", "Lemon Lab"],
  ["bundle_baron", "Bundle Baron"],
  ["envato_enigma", "Envato Enigma"],
  ["sticker_sensei", "Sticker Sensei"],
  ["wedding_wonder", "Wedding Wonder"],
  ["budget_bee", "Budget Bee"],
  ["journal_jedi", "Journal Jedi"],
  ["wallpaper_wizard", "Wallpaper Wizard"],
  ["pdf_phoenix", "PDF Phoenix"],
  ["icon_iliad", "Icon Iliad"],
  ["audio_archer", "Audio Archer"],
  ["motion_minstrel", "Motion Minstrel"],
  ["learn_lyra", "Learn Lyra"],
  ["plan_pixel", "Plan Pixel"],
  ["sticker_storm", "Sticker Storm"],
  ["niche_navigator", "Niche Navigator"],
];

function buildPlaybook(seed: number): CreatorPlaybook {
  return {
    pricingTiers: [
      { label: "Single download", priceUsd: Math.round((4 + det(seed) * 8) * 100) / 100 },
      { label: "Bundle", priceUsd: Math.round((19 + det(seed + 1) * 30) * 100) / 100 },
      { label: "All-access", priceUsd: Math.round((59 + det(seed + 2) * 80) * 100) / 100 },
    ],
    postingCadence: pick(
      ["3 listings/week", "Weekly drop + monthly bundle", "Daily TikTok + weekly listing", "Bi-weekly bundle release"],
      seed,
    ),
    topTags: pick(
      [
        ["minimal", "neutral", "boho"],
        ["aesthetic", "y2k", "kawaii"],
        ["productivity", "habit", "wellness"],
        ["wedding", "elegant", "modern"],
        ["budget", "finance", "monthly"],
        ["dark mode", "developer", "terminal"],
        ["academic", "study", "highschool"],
      ],
      seed + 3,
    ),
    funnels: pick(
      [
        ["Pinterest pin → Etsy listing → upsell bundle"],
        ["TikTok demo → Stan Store link → Discord upsell"],
        ["Reddit AMA → Gumroad coupon → email list"],
        ["YouTube tutorial → Notion template → Skool community"],
        ["Twitter thread → Lemonsqueezy → tier 2"],
      ],
      seed + 4,
    ),
    signatureStyle: pick(
      [
        "Editorial neutral palette with serif typography",
        "Pastel gradients and rounded sans",
        "High-contrast brutalist with mono fonts",
        "Hand-drawn doodles and warm tones",
        "Minimal monochrome with accent neon",
      ],
      seed + 5,
    ),
  };
}

export const mockCreators: Creator[] = creatorNames.map(([handle, displayName], i) => {
  const platform = pick(platformList, i + 7);
  const productCount = randInt(i + 11, 8, 92);
  const totalEstRevenueUsd = Math.round(productCount * randInt(i + 13, 80, 1400));
  const niches = pick(
    [
      ["etsy_printable", "kdp_low_content"],
      ["notion_template", "ai_prompt_pack"],
      ["gumroad_ebook", "course"],
      ["figma_kit", "ai_prompt_pack"],
      ["lightroom_preset", "video_template"],
      ["sample_pack", "video_template"],
      ["plr_pack", "gumroad_ebook"],
      ["dataset", "micro_saas"],
      ["shopify_app", "micro_saas"],
      ["discord_bot", "micro_saas"],
      ["wordpress_theme", "figma_kit"],
      ["browser_extension", "micro_saas"],
    ],
    i + 17,
  );
  return {
    id: `creator_${i + 1}`,
    sourcePlatform: platform,
    handle: handle as string,
    displayName: displayName as string,
    profileUrl: `https://${platform.replace(/_/g, "")}.com/${handle}`,
    avatarUrl: `https://i.pravatar.cc/150?img=${(i % 70) + 1}`,
    followerCount: randInt(i + 19, 800, 240_000),
    productCount,
    totalEstRevenueUsd,
    niches,
    notes: i % 5 === 0 ? "Reverse-engineer their bundle pricing — keystone strategy." : null,
    lastEnrichedAt: isoMinusDays(randInt(i + 23, 0, 9)),
    playbook: buildPlaybook(i + 31),
  };
});

// ----------------------------- Products -----------------------------

const productTitlesByNiche: Record<NicheValue, string[]> = {
  etsy_printable: [
    "Minimalist Daily Planner Printable Bundle",
    "Wedding Welcome Sign Editable Template",
    "Boho Kids Chore Chart Printables",
    "Aesthetic Budget Tracker — 47 Pages",
    "Engagement Party Games Printable Pack",
  ],
  notion_template: [
    "Notion Second Brain OS 4.0",
    "Indie Hacker Notion Operating System",
    "Notion Habit Garden — Aesthetic",
    "Notion Content Calendar for Creators",
    "Founder OS — Notion Template Pack",
  ],
  gumroad_ebook: [
    "From 0 to $10k MRR: A Founder Playbook",
    "Cold Outreach That Doesn't Suck",
    "30 Day Indie Launch Sprint",
    "Buy a Boring Business — A Tactical Guide",
    "The Self-Funded Studio",
  ],
  kdp_low_content: [
    "Daily Wins — 6x9 Lined Journal",
    "Pregnancy Tracker — Low-Content Notebook",
    "Mindful Mornings 90 Day Planner",
    "Habit Tracker Notebook — Pastel Edition",
    "Christian Faith Daily Journal — KDP",
  ],
  course: [
    "Etsy Mastery 2026 — Cohort 12",
    "Notion for Solopreneurs — Self-Paced",
    "The Print-on-Demand Profit Lab",
    "AI Side Hustle Bootcamp",
    "Newsletter to $1k MRR",
  ],
  ai_prompt_pack: [
    "ChatGPT Marketing Prompt Vault — 1,200 prompts",
    "Midjourney Cinematic Prompt Pack",
    "Claude Coding Workflow Library",
    "Perplexity Research Prompt Toolkit",
    "AI Agent Recipe Pack — n8n + Make",
  ],
  figma_kit: [
    "Auralis — Modern SaaS Figma Kit",
    "Lifelog Mobile UI Kit (Auto Layout)",
    "Dashboards Pro — 220 Figma Components",
    "Brand-in-a-Box Figma Templates",
    "Wireframe Atlas — 600 Components",
  ],
  wordpress_theme: [
    "Substacky — Newsletter WordPress Theme",
    "FoundryOS — Startup WP Theme",
    "Locale — Local Business Block Theme",
    "Newsroom Pro — News & Magazine WP Theme",
    "Studio95 — Portfolio WP Theme",
  ],
  shopify_app: [
    "Reorder Express — Shopify App",
    "Bundle Builder Lite — Shopify",
    "Customs Duty Calculator — Shopify App",
    "Loyalty Spark — Rewards Shopify App",
    "Returnly Lite — Returns Portal",
  ],
  lightroom_preset: [
    "Cinematic Travel Lightroom Pack",
    "Moody Wedding Mobile Presets",
    "Foodie Aesthetic Lightroom Pack",
    "Boudoir Editorial Lightroom Pack",
    "Boho Lifestyle Lightroom Mobile Pack",
  ],
  sample_pack: [
    "Lo-Fi Hip Hop Drum Kit Vol 7",
    "Hyperpop Vocal Chops Pack",
    "Phonk Drift Sample Library",
    "Trap Soul Loop Pack",
    "Synthwave 1985 Analog Pack",
  ],
  video_template: [
    "Cinematic Travel Premiere Pack",
    "TikTok Hook Templates — After Effects",
    "Real Estate Listing AE Templates",
    "YouTube Intro Pack — Dynamic Logos",
    "DaVinci LUTs Cinematic Bundle",
  ],
  dataset: [
    "S&P 500 Earnings Call Sentiment Dataset",
    "Etsy Top-100 Daily Snapshot Dataset",
    "Reddit r/entrepreneur Submissions Dataset",
    "Web3 Token Launches 2024-2025 Dataset",
    "Indie SaaS Pricing Pages Dataset",
  ],
  plr_pack: [
    "PLR Pack: 50 Wellness Articles",
    "PLR Affiliate Marketing Mega Bundle",
    "PLR — Personal Finance Email Series",
    "PLR — Printable Self-Care Workbook",
    "PLR — AI for Solopreneurs Mini Course",
  ],
  micro_saas: [
    "TweetSched — Schedule X Threads",
    "MetaPing — SEO Snapshot Service",
    "InvoiceLite — Freelancer Invoicing",
    "ScreenLoop — Async Screen Recorder",
    "FormFlow — Public Form Forwarder",
  ],
  browser_extension: [
    "TabHaven — Saves Sessions Forever",
    "PromptKeep — Save Best AI Prompts",
    "QuickQuote — Cite Highlighted Text",
    "DealDetective — Track Etsy Sales",
    "TweetBetter — Twitter UX Boost",
  ],
  discord_bot: [
    "ServerSentry — Mod & Onboarding Bot",
    "GiveawayKing — Giveaway Bot",
    "TipMaster — Tipping & Reactions Bot",
    "RaidShield — Anti-Raid Bot",
    "RoleCraft — Reaction Roles Bot",
  ],
  game_asset: [
    "Pixel RPG Character Sprite Pack",
    "2D Platformer Background Bundle",
    "Sci-Fi UI Kit for Unity",
    "Top-Down Tile Set — Cottage Core",
    "Stylized 3D Foliage Pack",
  ],
  print_on_demand: [
    "Funny Cat Mom T-Shirt Design Bundle",
    "Mental Health Awareness Tee Designs",
    "Christian Faith T-Shirt Designs",
    "Teacher Appreciation Mug Designs",
    "Halloween Pumpkin Tee Bundle",
  ],
  other: [
    "Email List Lead Magnet Pack",
    "Resume Templates — Modern Pack",
    "Cold DM Script Library",
    "Investor Pitch Deck Template",
    "Crypto Whitepaper Template",
  ],
};

const tagsByNiche: Record<NicheValue, string[][]> = {
  etsy_printable: [["minimalist", "boho", "neutral"], ["wedding", "elegant"], ["kids", "chore"], ["budget", "finance"], ["party", "games"]],
  notion_template: [["productivity", "second-brain"], ["indie-hacker", "founder"], ["habit", "aesthetic"], ["content-calendar"], ["operating-system"]],
  gumroad_ebook: [["mrr", "founder", "growth"], ["sales", "outreach"], ["launch", "indie"], ["acquisition", "boring-business"], ["studio", "agency"]],
  kdp_low_content: [["journal", "lined"], ["pregnancy", "tracker"], ["mindful", "morning"], ["habit", "tracker"], ["faith", "christian"]],
  course: [["etsy", "cohort"], ["notion", "self-paced"], ["pod", "print-on-demand"], ["ai", "side-hustle"], ["newsletter", "growth"]],
  ai_prompt_pack: [["chatgpt", "marketing"], ["midjourney", "cinematic"], ["claude", "coding"], ["perplexity", "research"], ["agents", "n8n"]],
  figma_kit: [["saas", "modern"], ["mobile", "auto-layout"], ["dashboards", "components"], ["brand", "templates"], ["wireframe", "atlas"]],
  wordpress_theme: [["newsletter", "substack"], ["startup", "founder"], ["local", "business"], ["news", "magazine"], ["portfolio", "studio"]],
  shopify_app: [["reorder", "ecommerce"], ["bundle", "checkout"], ["customs", "international"], ["loyalty", "rewards"], ["returns", "portal"]],
  lightroom_preset: [["cinematic", "travel"], ["moody", "wedding"], ["foodie", "blogger"], ["boudoir", "editorial"], ["boho", "lifestyle"]],
  sample_pack: [["lofi", "hiphop"], ["hyperpop", "vocal"], ["phonk", "drift"], ["trap", "soul"], ["synthwave", "analog"]],
  video_template: [["cinematic", "travel"], ["tiktok", "hooks"], ["real-estate", "ae"], ["youtube", "intro"], ["davinci", "luts"]],
  dataset: [["finance", "sentiment"], ["etsy", "tracking"], ["reddit", "scrape"], ["web3", "tokens"], ["indie", "pricing"]],
  plr_pack: [["wellness", "articles"], ["affiliate", "marketing"], ["finance", "email"], ["self-care", "workbook"], ["ai", "minicourse"]],
  micro_saas: [["twitter", "scheduler"], ["seo", "snapshot"], ["invoice", "freelance"], ["screen", "async"], ["form", "forward"]],
  browser_extension: [["tabs", "session"], ["prompts", "vault"], ["citation", "research"], ["etsy", "tracker"], ["twitter", "ux"]],
  discord_bot: [["moderation", "onboarding"], ["giveaway"], ["tipping"], ["raid", "shield"], ["roles", "reaction"]],
  game_asset: [["pixel", "sprite"], ["platformer", "bg"], ["unity", "scifi"], ["tileset", "cottagecore"], ["3d", "foliage"]],
  print_on_demand: [["funny", "cat-mom"], ["mental-health"], ["christian", "faith"], ["teacher", "appreciation"], ["halloween", "pumpkin"]],
  other: [["lead-magnet", "email"], ["resume", "modern"], ["dm", "outreach"], ["pitch", "investor"], ["crypto", "whitepaper"]],
};

const nicheValues = NICHE_LIST.map((n) => n.value);

const productSeed: Product[] = [];
for (let i = 0; i < 80; i++) {
  const niche = nicheValues[i % nicheValues.length] as NicheValue;
  const titles = productTitlesByNiche[niche];
  const tags = tagsByNiche[niche];
  const idx = Math.floor(i / nicheValues.length) % titles.length;
  const platform = pick(platformList, i + 41);
  const creator = mockCreators[i % mockCreators.length] as Creator;
  const priceUsd = Math.round(randFloat(i + 53, 4, 149) * 100) / 100;
  const ratingAvg = Math.round((4.1 + det(i + 59) * 0.85) * 100) / 100;
  const ratingCount = randInt(i + 61, 12, 4200);
  const salesLow = randInt(i + 67, 8, 380);
  const salesHigh = salesLow + randInt(i + 71, 12, 320);
  const revLow = Math.round(salesLow * priceUsd);
  const revHigh = Math.round(salesHigh * priceUsd);
  productSeed.push({
    id: `product_${i + 1}`,
    sourcePlatform: platform,
    sourceUrl: `https://${platform.replace(/_/g, "")}.com/product/${i + 1}`,
    title: titles[idx]!,
    creator: creator.displayName,
    creatorId: creator.id,
    priceUsd,
    currency: "USD",
    ratingAvg,
    ratingCount,
    estMonthlySalesLow: salesLow,
    estMonthlySalesHigh: salesHigh,
    estMonthlyRevenueLow: revLow,
    estMonthlyRevenueHigh: revHigh,
    niche,
    tags: tags[idx % tags.length]!,
    thumbnailUrl: `https://picsum.photos/seed/${niche}-${i}/400/300`,
    firstSeenAt: isoMinusDays(randInt(i + 79, 4, 90)),
    lastSeenAt: isoMinusHours(randInt(i + 83, 1, 48)),
  });
}

export const mockProducts = productSeed;

// Recompute productCount per niche
for (const niche of mockNiches) {
  niche.productCount = mockProducts.filter((p) => p.niche === niche.slug).length;
}

// ----------------------------- Signals -----------------------------

const signalTypes = [
  "marketplace_listing",
  "trend_query",
  "social_mention",
  "launch",
  "milestone",
  "dataset_drop",
  "plr_release",
  "expired_listing",
] as const;

const signalSnippets = [
  "Hit 500 sales in 14 days — top 5 in subcategory.",
  "Search volume up 220% this week, low competition score.",
  "Reddit thread blew up — 1.2k upvotes, big affiliate energy.",
  "Launched on Product Hunt — #3 of the day so far.",
  "Crossed $25k MRR milestone, posted in IH.",
  "Kaggle drop: 1.8M rows, MIT license, no API yet.",
  "PLR vendor released a 28-piece pack — license check needed.",
  "Etsy shop expired with 1k+ daily sales — domain available.",
];

const signalSeed: Signal[] = [];
for (let i = 0; i < 60; i++) {
  const niche = nicheValues[i % nicheValues.length] as NicheValue;
  const platform = pick(platformList.concat(["reddit", "product_hunt", "indie_hackers", "google_trends"] as SourcePlatform[]), i + 91);
  const signalType = signalTypes[i % signalTypes.length];
  signalSeed.push({
    id: `signal_${i + 1}`,
    signalType,
    sourcePlatform: platform,
    sourceUrl: `https://${platform.replace(/_/g, "")}.com/signal/${i + 1}`,
    sourceId: `${platform}-${i + 1}`,
    niche,
    title: pick(productTitlesByNiche[niche], i + 97),
    snippet: signalSnippets[i % signalSnippets.length] as string,
    engagement: {
      upvotes: randInt(i + 101, 12, 5400),
      comments: randInt(i + 103, 0, 280),
      sales: randInt(i + 107, 0, 1200),
    },
    score: Math.round(randFloat(i + 109, 22, 96)),
    processedAt: isoMinusHours(randInt(i + 113, 0, 240)),
    ideaIdsLinked: i % 3 === 0 ? [`opportunity_${(i % 30) + 1}`] : [],
  });
}

export const mockSignals = signalSeed;

// ----------------------------- Trends -----------------------------

const trendKeywords = [
  "notion second brain",
  "ai prompts pack",
  "boho wedding printable",
  "lo-fi sample pack",
  "etsy printable budget binder",
  "indie hacker template",
  "midjourney cinematic prompts",
  "kdp low content journal",
  "shopify app extensions",
  "discord bot moderation",
  "ai agent recipes",
  "lightroom mobile presets",
  "figma dashboard kit",
  "substack wordpress theme",
  "plr wellness pack",
];

export const mockTrends: Trend[] = trendKeywords.map((keyword, i) => {
  const days = 30;
  const series = Array.from({ length: days }).map((_, d) => {
    const base = 100 + det(i * 31 + d) * 60;
    const trend = (d / days) * randFloat(i + 1, 20, 80);
    return {
      date: isoMinusDays(days - 1 - d),
      value: Math.round(base + trend),
    };
  });
  const volume7d = series.slice(-7).reduce((a, b) => a + b.value, 0);
  const volume30d = series.reduce((a, b) => a + b.value, 0);
  const growthPct = Math.round(randFloat(i + 17, -8, 62));
  return {
    id: `trend_${i + 1}`,
    keyword,
    niche: nicheValues[i % nicheValues.length] as NicheValue,
    momentumScore: Math.round(randFloat(i + 23, 35, 96)),
    volume7d,
    volume30d,
    growthPct,
    geo: pick(["US", "UK", "DE", "Worldwide", "CA", "AU"], i + 29),
    series,
    snapshotDate: isoMinusDays(0),
  };
});

// ----------------------------- Opportunities -----------------------------

const opportunityTypes = [
  "trend_play",
  "replication",
  "repackage_resell",
  "niche_expansion",
  "micro_saas",
  "plr_remix",
  "dataset_wrap",
];
const buildEfforts = ["weekend", "week", "month", "quarter", "year_plus"];
const statuses = ["tracking", "shortlisted", "building", "launched", "abandoned", "archived"];

const buildPlanTemplates: Record<string, BuildPlan> = {
  weekend: {
    weeks: [
      { label: "Day 1", deliverables: ["Lock in concept + 3 reference products", "Draft hero copy", "Create 5 design variants in Figma"] },
      { label: "Day 2", deliverables: ["Finalize bundle", "Set up Gumroad listing", "Schedule launch tweet thread"] },
    ],
    stack: ["Figma", "Gumroad", "Pinterest scheduler"],
    risks: ["Saturated keywords", "Trademark conflicts on POD designs"],
    monetization: ["$9 single + $19 bundle", "Affiliate via creators on Whop"],
    successMetrics: ["10 sales in week 1", "5-star avg over 20 reviews"],
  },
  week: {
    weeks: [
      { label: "Week 1", deliverables: ["Validate via TikTok demo", "Build v1 in Notion or Figma", "Recruit 3 beta buyers"] },
    ],
    stack: ["Notion", "TikTok", "Stan Store"],
    risks: ["TikTok algo flips", "Low-margin churn"],
    monetization: ["$29 main + $99 community"],
    successMetrics: ["$500 first week"],
  },
  month: {
    weeks: [
      { label: "Week 1", deliverables: ["Audience research + competitor teardown", "Define MVP scope"] },
      { label: "Week 2", deliverables: ["Build core flow", "Internal QA"] },
      { label: "Week 3", deliverables: ["Closed beta with 20 users", "Iterate"] },
      { label: "Week 4", deliverables: ["Public launch on Product Hunt", "Post on r/SideProject"] },
    ],
    stack: ["Next.js", "Vercel", "Stripe", "Resend"],
    risks: ["Underpriced — set tier 2 at $49+", "DAU not enough for retention"],
    monetization: ["$19/mo solo, $49/mo team"],
    successMetrics: ["$1k MRR by day 60"],
  },
  quarter: {
    weeks: [
      { label: "Month 1", deliverables: ["Validate niche, design system, infra"] },
      { label: "Month 2", deliverables: ["MVP, closed beta, polish"] },
      { label: "Month 3", deliverables: ["Launch + content engine"] },
    ],
    stack: ["Next.js", "Postgres", "Inngest", "Anthropic"],
    risks: ["Scope creep", "AI cost runaway"],
    monetization: ["$49/mo + usage-based"],
    successMetrics: ["100 paid users", "$5k MRR"],
  },
  year_plus: {
    weeks: [
      { label: "Quarter 1", deliverables: ["Foundation + alpha"] },
      { label: "Quarter 2", deliverables: ["Public beta, paid pilots"] },
      { label: "Quarter 3", deliverables: ["GA + marketplace"] },
      { label: "Quarter 4", deliverables: ["Enterprise tier + team"] },
    ],
    stack: ["Next.js", "Postgres + pgvector", "Inngest", "Stripe", "Vercel"],
    risks: ["Solo bandwidth", "Bigger players moving in"],
    monetization: ["Tiered SaaS with annual prepay"],
    successMetrics: ["$30k MRR, 5% monthly churn"],
  },
};

function buildScoreBreakdown(score: number, seed: number): ScoreBreakdown {
  const dim = (base: number, weight: number, label: string, key: string) => {
    const value = Math.max(8, Math.min(98, base + Math.round(randFloat(seed + key.length, -6, 6))));
    return { key, value, weight, rationale: `Heuristic estimate based on ${label}.` };
  };
  const dims = [
    dim(score + randInt(seed, -8, 10), 0.25, "search volume + social mentions", "demand"),
    dim(score + randInt(seed + 1, -10, 6), 0.2, "creator concentration in niche", "competition"),
    dim(score + randInt(seed + 2, -6, 12), 0.25, "price point × est. units", "revenue"),
    dim(score + randInt(seed + 3, -8, 8), 0.15, "build complexity", "buildEffort"),
    dim(score + randInt(seed + 4, -6, 10), 0.15, "week-over-week growth", "trend"),
  ];
  const ruleModifiers =
    seed % 4 === 0
      ? [
          {
            ruleId: "rule_3",
            label: "Boost: Notion-related",
            ruleType: "boost",
            delta: 6,
            matched: ["notion"],
          },
        ]
      : [];
  const patternModifiers =
    seed % 5 === 0
      ? [{ patternId: "pattern_2", label: "User saves under-$30 templates", delta: 4 }]
      : [];
  return {
    dimensions: {
      demand: { value: dims[0]!.value, weight: dims[0]!.weight, rationale: dims[0]!.rationale },
      competition: { value: dims[1]!.value, weight: dims[1]!.weight, rationale: dims[1]!.rationale },
      revenue: { value: dims[2]!.value, weight: dims[2]!.weight, rationale: dims[2]!.rationale },
      buildEffort: { value: dims[3]!.value, weight: dims[3]!.weight, rationale: dims[3]!.rationale },
      trend: { value: dims[4]!.value, weight: dims[4]!.weight, rationale: dims[4]!.rationale },
    },
    ruleModifiers,
    patternModifiers,
    finalScore: score,
    computedAt: isoMinusHours(seed % 24),
  };
}

const opportunitySummaries = [
  "A weekend printable bundle riding the rising 'aesthetic finance' search trend on Etsy.",
  "Replicate the top Notion second-brain template with a vertical-specific twist for indie SaaS founders.",
  "Repackage a Kaggle macro-economic dataset behind a paid API for finance creators.",
  "Niche expansion: take a wedding planner template and adapt for queer ceremonies — visible underserved market.",
  "Micro-SaaS that wraps a multi-source TikTok hashtag tracker for indie creators.",
  "PLR remix: rebrand a wellness PLR pack with on-trend pastel design language.",
  "Dataset wrap: scrape and segment Whop top creators for a recurring data product.",
  "Trend play: AI prompt pack for cold outreach using Claude — niche but hot.",
  "Replicate Patreon top tier playbook for a Discord-native community OS.",
  "Notion template + Figma asset hybrid for podcast operators — repeat-buyer market.",
  "Etsy printable: pregnancy planner with multilingual support, low-content version on KDP.",
  "Shopify app: customs duty calculator for international e-commerce.",
  "Course: 'AI Side Hustle Bootcamp' with weekly live sessions on Skool.",
  "Browser extension: 'PromptKeep' to save and rate AI prompts across providers.",
  "Discord bot: 'ServerSentry' premium tier with onboarding analytics.",
  "Game asset: stylized 3D foliage pack for cozy game devs on Unity Asset Store.",
  "Lightroom presets: 'Cinematic Travel' pack with mobile + desktop variants.",
  "Sample pack: 'Phonk Drift' with bonus stems for FL Studio producers.",
  "Video template: TikTok hook templates for After Effects with auto-captions.",
  "WordPress theme: newsletter-first 'Substacky' theme with paywall block.",
  "Figma kit: dashboards pro with 220 components, dark + light variants.",
  "AI prompt pack: ChatGPT marketing vault with niche-specific frameworks.",
  "Notion template: indie hacker OS with content calendar + revenue tracker.",
  "Gumroad ebook: '30 Day Indie Launch Sprint' with companion checklist.",
  "KDP low-content: pregnancy tracker notebook with weekly milestones.",
  "Course: 'Newsletter to $1k MRR' with cohort-based learning on Skool.",
  "Lemonsqueezy: 'FormFlow' public form forwarder with Slack integration.",
  "Patreon: top-tier playbook for art creators with monthly digital drops.",
  "Skool: community for indie SaaS founders with weekly office hours.",
  "Teachers Pay Teachers: high-school study planner with multilingual support.",
];

const opportunitySeed: Opportunity[] = [];
for (let i = 0; i < 30; i++) {
  const niche = nicheValues[i % nicheValues.length] as NicheValue;
  const summary = opportunitySummaries[i] as string;
  const opportunityType = opportunityTypes[i % opportunityTypes.length] as string;
  const buildEffort = buildEfforts[i % buildEfforts.length] as string;
  const status = statuses[i % statuses.length] as string;
  const score = Math.round(8 + (i / 30) * 90 + randFloat(i + 131, -5, 5));
  const projectedRevenueUsd = Math.round(randFloat(i + 137, 480, 24_000));
  opportunitySeed.push({
    id: `opportunity_${i + 1}`,
    title: `${opportunitySummaries[i]?.split(":")[0] ?? "Opportunity"} — ${niche.replace(/_/g, " ")}`,
    summary,
    niche,
    opportunityType,
    buildEffort,
    projectedRevenueUsd,
    status,
    sourceProductIds: [`product_${(i % 80) + 1}`, `product_${((i + 7) % 80) + 1}`],
    sourceSignalIds: [`signal_${(i % 60) + 1}`, `signal_${((i + 11) % 60) + 1}`],
    aiRationale: `Demand evidenced by ${randInt(i + 139, 3, 9)} adjacent listings and ${randInt(
      i + 141,
      2,
      7,
    )} trend signals. Competition pocket is shallow due to ${pick(
      ["fragmented creator base", "lack of curated bundles", "no dominant brand", "stale top-rated assets"],
      i + 143,
    )}. Project's ROI breakeven at ~${randInt(i + 147, 18, 80)} sales.`,
    aiBuildPlan: buildPlanTemplates[buildEffort] as BuildPlan,
    score: Math.max(0, Math.min(100, score)),
    scoreBreakdown: buildScoreBreakdown(score, i + 1),
    createdBy: i % 4 === 0 ? "user" : "ai",
    createdAt: isoMinusDays(randInt(i + 151, 0, 25)),
    updatedAt: isoMinusHours(randInt(i + 157, 1, 96)),
    votes: { up: randInt(i + 163, 0, 12), down: randInt(i + 167, 0, 4) },
    saved: i % 3 === 0,
  });
}
opportunitySeed.sort((a, b) => b.score - a.score);
export const mockOpportunities = opportunitySeed;

// Update niche opportunity counts
for (const niche of mockNiches) {
  niche.opportunityCount = mockOpportunities.filter((o) => o.niche === niche.slug).length;
}

// ----------------------------- Golden Rules -----------------------------

export const mockGoldenRules: GoldenRule[] = [
  { id: "rule_1", label: "Block: NSFW or explicit", description: "Never surface adult content.", ruleType: "block", niche: null, keywords: ["nsfw", "explicit", "adult"], weight: 1, active: true, createdBy: "user_andrei", createdAt: isoMinusDays(120) },
  { id: "rule_2", label: "Block: trademark heavy POD", description: "Skip Disney / sports teams etc.", ruleType: "block", niche: "print_on_demand", keywords: ["disney", "marvel", "nfl", "nba"], weight: 1, active: true, createdBy: "user_andrei", createdAt: isoMinusDays(110) },
  { id: "rule_3", label: "Boost: Notion-adjacent", description: "Notion templates have the user's domain edge.", ruleType: "boost", niche: "notion_template", keywords: ["notion", "second-brain", "operating-system"], weight: 0.7, active: true, createdBy: "user_andrei", createdAt: isoMinusDays(85) },
  { id: "rule_4", label: "Boost: weekend builds", description: "User's preferred cadence.", ruleType: "boost", niche: null, keywords: ["weekend", "fast-launch"], weight: 0.6, active: true, createdBy: "user_andrei", createdAt: isoMinusDays(80) },
  { id: "rule_5", label: "Penalize: physical fulfillment", description: "User wants pure digital.", ruleType: "penalize", niche: null, keywords: ["printful", "shipping", "warehouse"], weight: 0.7, active: true, createdBy: "user_andrei", createdAt: isoMinusDays(70) },
  { id: "rule_6", label: "Require: license clear", description: "Resellable assets must have explicit license.", ruleType: "require", niche: null, keywords: ["license", "rights"], weight: 0.9, active: true, createdBy: "user_andrei", createdAt: isoMinusDays(65) },
  { id: "rule_7", label: "Penalize: course farms", description: "Avoid generic Skillshare-style courses.", ruleType: "penalize", niche: "course", keywords: ["skillshare", "udemy-clone"], weight: 0.5, active: true, createdBy: "user_editor", createdAt: isoMinusDays(60) },
  { id: "rule_8", label: "Boost: AI-leveraged", description: "Anything that uses AI as a moat.", ruleType: "boost", niche: null, keywords: ["ai", "claude", "gpt", "embedding"], weight: 0.8, active: true, createdBy: "user_andrei", createdAt: isoMinusDays(55) },
  { id: "rule_9", label: "Require: under $1k tooling", description: "Solo founder budget.", ruleType: "require", niche: null, keywords: ["solo", "indie"], weight: 0.4, active: false, createdBy: "user_andrei", createdAt: isoMinusDays(50) },
  { id: "rule_10", label: "Penalize: discord-only audience", description: "Hard to attribute revenue.", ruleType: "penalize", niche: null, keywords: ["discord-only", "community-only"], weight: 0.4, active: true, createdBy: "user_andrei", createdAt: isoMinusDays(45) },
  { id: "rule_11", label: "Boost: recurring revenue", description: "Prefer SaaS / membership over one-off.", ruleType: "boost", niche: null, keywords: ["saas", "membership", "subscription"], weight: 0.7, active: true, createdBy: "user_andrei", createdAt: isoMinusDays(40) },
  { id: "rule_12", label: "Block: MLM-adjacent", description: "Never recommend MLM playbooks.", ruleType: "block", niche: null, keywords: ["mlm", "downline"], weight: 1, active: true, createdBy: "user_andrei", createdAt: isoMinusDays(35) },
  { id: "rule_13", label: "Penalize: requires headless scraping for production", description: "Higher legal/ops cost.", ruleType: "penalize", niche: null, keywords: ["headless", "puppeteer-prod"], weight: 0.4, active: true, createdBy: "user_andrei", createdAt: isoMinusDays(30) },
  { id: "rule_14", label: "Boost: vertical SaaS", description: "Underserved verticals win.", ruleType: "boost", niche: "micro_saas", keywords: ["vertical", "niche-saas"], weight: 0.65, active: true, createdBy: "user_andrei", createdAt: isoMinusDays(25) },
  { id: "rule_15", label: "Require: real demand evidence", description: "Need at least 2 demand signals.", ruleType: "require", niche: null, keywords: ["demand", "evidence"], weight: 0.7, active: true, createdBy: "user_andrei", createdAt: isoMinusDays(20) },
  { id: "rule_16", label: "Penalize: undifferentiated KDP", description: "Generic journals are saturated.", ruleType: "penalize", niche: "kdp_low_content", keywords: ["lined-journal", "blank-notebook"], weight: 0.5, active: true, createdBy: "user_andrei", createdAt: isoMinusDays(18) },
  { id: "rule_17", label: "Boost: Etsy + KDP combo", description: "Cross-platform packaging.", ruleType: "boost", niche: null, keywords: ["etsy", "kdp", "cross-platform"], weight: 0.6, active: true, createdBy: "user_andrei", createdAt: isoMinusDays(14) },
  { id: "rule_18", label: "Penalize: regulatory risk", description: "Health/finance claims need extra care.", ruleType: "penalize", niche: null, keywords: ["medical-advice", "investment-advice"], weight: 0.6, active: true, createdBy: "user_andrei", createdAt: isoMinusDays(11) },
  { id: "rule_19", label: "Boost: bundleable assets", description: "Easy to extend SKU count.", ruleType: "boost", niche: null, keywords: ["bundle", "pack", "extensible"], weight: 0.5, active: true, createdBy: "user_andrei", createdAt: isoMinusDays(7) },
  { id: "rule_20", label: "Block: PII data products", description: "No personal data resale.", ruleType: "block", niche: "dataset", keywords: ["pii", "personal-data", "email-leak"], weight: 1, active: true, createdBy: "user_andrei", createdAt: isoMinusDays(2) },
];

// ----------------------------- Feedback Patterns -----------------------------

export const mockFeedbackPatterns: FeedbackPattern[] = [
  { id: "pattern_1", label: "User upvotes Notion-related opportunities", description: "8 of last 10 upvotes were Notion-tagged.", derivedFrom: "votes", confidence: 0.86, signalKeywords: ["notion", "second-brain"], niche: "notion_template", weight: 0.7, lastConfirmedAt: isoMinusDays(1) },
  { id: "pattern_2", label: "Saves under-$30 templates", description: "73% of saves are sub-$30 listings.", derivedFrom: "saves", confidence: 0.74, signalKeywords: ["under-30", "low-price"], niche: null, weight: 0.5, lastConfirmedAt: isoMinusDays(2) },
  { id: "pattern_3", label: "Abandons multi-month builds", description: "User abandons opportunities tagged quarter+.", derivedFrom: "abandons", confidence: 0.81, signalKeywords: ["quarter", "year_plus"], niche: null, weight: 0.6, lastConfirmedAt: isoMinusDays(4) },
  { id: "pattern_4", label: "Builds AI-leveraged ideas", description: "Last 3 builds were AI-tagged.", derivedFrom: "builds", confidence: 0.92, signalKeywords: ["ai", "agent", "embedding"], niche: null, weight: 0.7, lastConfirmedAt: isoMinusDays(0) },
  { id: "pattern_5", label: "Skips physical fulfillment", description: "12 down-votes on POD/Printful items.", derivedFrom: "votes", confidence: 0.79, signalKeywords: ["printful", "shipping"], niche: "print_on_demand", weight: 0.6, lastConfirmedAt: isoMinusDays(5) },
  { id: "pattern_6", label: "Likes weekend cadence", description: "8 of 12 saves are weekend-effort.", derivedFrom: "saves", confidence: 0.82, signalKeywords: ["weekend"], niche: null, weight: 0.7, lastConfirmedAt: isoMinusDays(3) },
  { id: "pattern_7", label: "Prefers Etsy + KDP combos", description: "Cross-platform combos saved more.", derivedFrom: "saves", confidence: 0.69, signalKeywords: ["etsy", "kdp"], niche: null, weight: 0.4, lastConfirmedAt: isoMinusDays(6) },
  { id: "pattern_8", label: "Down-votes Discord-only", description: "Voted down 5 Discord-bot ideas in a row.", derivedFrom: "votes", confidence: 0.7, signalKeywords: ["discord-only"], niche: "discord_bot", weight: 0.4, lastConfirmedAt: isoMinusDays(7) },
  { id: "pattern_9", label: "Annotates dataset opportunities", description: "Adds notes to dataset/PLR opportunities.", derivedFrom: "saves", confidence: 0.66, signalKeywords: ["dataset", "plr"], niche: "dataset", weight: 0.4, lastConfirmedAt: isoMinusDays(8) },
  { id: "pattern_10", label: "Builds with recurring monetization", description: "Picks SaaS/subscription monetization 4 of 5 times.", derivedFrom: "builds", confidence: 0.78, signalKeywords: ["saas", "subscription", "membership"], niche: null, weight: 0.6, lastConfirmedAt: isoMinusDays(0) },
];

// ----------------------------- Sources -----------------------------

const sourceLabels: Record<SourcePlatform, { label: string; cron: string; requiresHeadless?: boolean }> = {
  etsy: { label: "Etsy digital downloads", cron: "0 */6 * * *", requiresHeadless: true },
  gumroad: { label: "Gumroad Discover", cron: "0 */4 * * *", requiresHeadless: true },
  creative_market: { label: "Creative Market", cron: "0 */8 * * *", requiresHeadless: true },
  envato: { label: "Envato Market (API)", cron: "0 */3 * * *" },
  design_bundles: { label: "Design Bundles", cron: "0 */12 * * *", requiresHeadless: true },
  kdp: { label: "Amazon KDP", cron: "0 0 */1 * *", requiresHeadless: true },
  redbubble: { label: "Redbubble trends", cron: "0 0 */1 * *", requiresHeadless: true },
  shopify_app_store: { label: "Shopify App Store", cron: "0 */6 * * *", requiresHeadless: true },
  notion_marketplace: { label: "Notion templates", cron: "0 */6 * * *", requiresHeadless: true },
  whop: { label: "Whop top digital products", cron: "0 */6 * * *", requiresHeadless: true },
  sellfy: { label: "Sellfy public stores", cron: "0 */12 * * *", requiresHeadless: true },
  payhip: { label: "Payhip Explore", cron: "0 */8 * * *", requiresHeadless: true },
  stan: { label: "Stan Store top creators", cron: "0 */8 * * *", requiresHeadless: true },
  lemonsqueezy: { label: "Lemon Squeezy storefronts", cron: "0 */6 * * *", requiresHeadless: true },
  patreon: { label: "Patreon Most Popular", cron: "0 */12 * * *", requiresHeadless: true },
  skool: { label: "Skool top communities", cron: "0 */12 * * *", requiresHeadless: true },
  teachers_pay_teachers: { label: "Teachers Pay Teachers", cron: "0 */12 * * *", requiresHeadless: true },
  google_trends: { label: "Google Trends (SerpAPI)", cron: "0 0 * * *" },
  tiktok: { label: "TikTok Creative Center", cron: "0 */6 * * *" },
  pinterest: { label: "Pinterest Trends", cron: "0 0 * * *" },
  reddit: { label: "Reddit (passive income subs)", cron: "0 */1 * * *" },
  youtube: { label: "YouTube Data API", cron: "0 */4 * * *" },
  twitter: { label: "Twitter / X (Apify)", cron: "0 */3 * * *" },
  product_hunt: { label: "Product Hunt", cron: "0 */1 * * *" },
  hacker_news: { label: "Hacker News", cron: "*/30 * * * *" },
  indie_hackers: { label: "Indie Hackers", cron: "0 */2 * * *" },
  exploding_topics: { label: "Exploding Topics", cron: "0 12 * * *" },
  kaggle: { label: "Kaggle datasets", cron: "0 */6 * * *" },
  aws_data_exchange: { label: "AWS Data Exchange", cron: "0 0 * * *" },
  data_world: { label: "data.world", cron: "0 */12 * * *" },
  data_gov: { label: "data.gov", cron: "0 0 * * *" },
  rapidapi: { label: "RapidAPI marketplace", cron: "0 0 * * *" },
  plr_marketplace: { label: "PLR marketplaces", cron: "0 0 */2 * *", requiresHeadless: true },
  flippa: { label: "Flippa digital listings", cron: "0 0 * * *" },
  micro_acquire: { label: "MicroAcquire", cron: "0 0 * * *" },
  empire_flippers: { label: "Empire Flippers", cron: "0 0 * * *" },
  custom: { label: "Custom source", cron: "0 0 * * *" },
};

export const mockSources: Source[] = (Object.keys(sourceLabels) as SourcePlatform[]).map((platform, i) => ({
  id: `source_${platform}`,
  sourcePlatform: platform,
  label: sourceLabels[platform].label,
  config: { regions: ["US", "Worldwide"], minRating: 4.2 },
  enabled: i % 5 !== 4,
  cronSchedule: sourceLabels[platform].cron,
  lastRunAt: isoMinusHours(randInt(i + 173, 0, 96)),
  lastRunStatus: pick(["ok", "ok", "ok", "error", "running", "idle"], i + 179) as Source["lastRunStatus"],
  lastError: i % 8 === 7 ? "Cloudflare 403 — needs proxy rotation." : null,
  itemsTracked: randInt(i + 181, 12, 5400),
  requiresHeadless: !!sourceLabels[platform].requiresHeadless,
}));

// ----------------------------- Competitors -----------------------------

export const mockCompetitors: Competitor[] = mockCreators.slice(0, 10).map((c, i) => ({
  id: `competitor_${i + 1}`,
  creatorId: c.id,
  depth: i % 3 === 0 ? "deep" : "light",
  playbook: c.playbook ?? buildPlaybook(i + 7),
  notes: pick(
    [
      "Doubles down on bundle SKUs every quarter.",
      "Heavy Pinterest funnel; almost no email list.",
      "Discord-first, posts daily replays.",
      "Charges 2x — gets away with it via bundle stacking.",
      "Releases monthly free pack to feed list.",
    ],
    i + 13,
  ),
  lastReviewedAt: isoMinusDays(randInt(i + 17, 0, 18)),
}));

// ----------------------------- Digests -----------------------------

const digestSeed: Digest[] = [];
for (let i = 0; i < 7; i++) {
  digestSeed.push({
    id: `digest_daily_${i + 1}`,
    cadence: "daily",
    periodStart: isoMinusDays(i + 1),
    periodEnd: isoMinusDays(i),
    topOpportunityIds: [
      mockOpportunities[(i * 3) % mockOpportunities.length]?.id ?? "opportunity_1",
      mockOpportunities[(i * 3 + 1) % mockOpportunities.length]?.id ?? "opportunity_2",
      mockOpportunities[(i * 3 + 2) % mockOpportunities.length]?.id ?? "opportunity_3",
    ],
    risingNiches: [
      nicheValues[(i * 2) % nicheValues.length] as string,
      nicheValues[(i * 2 + 1) % nicheValues.length] as string,
    ],
    topProducts: mockProducts.slice(i * 3, i * 3 + 3).map((p) => ({
      id: p.id,
      title: p.title,
      revenue: p.estMonthlyRevenueHigh ?? 0,
    })),
    aiSummary: `Daily digest ${i + 1}: ${mockOpportunities[i]?.title ?? "Top opportunity"} continues to climb. ${mockTrends[i % mockTrends.length]?.keyword} is up ${mockTrends[i % mockTrends.length]?.growthPct ?? 0}% week-over-week.`,
    sentTo: ["andrei@nicheiq.com"],
    createdAt: isoMinusDays(i),
  });
}
digestSeed.push({
  id: `digest_weekly_1`,
  cadence: "weekly",
  periodStart: isoMinusDays(7),
  periodEnd: isoMinusDays(0),
  topOpportunityIds: mockOpportunities.slice(0, 5).map((o) => o.id),
  risingNiches: ["notion_template", "ai_prompt_pack", "etsy_printable"],
  topProducts: mockProducts.slice(0, 6).map((p) => ({ id: p.id, title: p.title, revenue: p.estMonthlyRevenueHigh ?? 0 })),
  aiSummary:
    "Weekly digest: AI prompt packs and Notion second-brain templates dominated this week. Five new dataset drops on Kaggle qualify for a repackage play.",
  sentTo: ["andrei@nicheiq.com", "editor@nicheiq.com"],
  createdAt: isoMinusDays(0),
});
export const mockDigests = digestSeed;

// ----------------------------- Resellable Assets -----------------------------

export const mockResellable: ResellableAsset[] = [
  { id: "asset_1", sourcePlatform: "kaggle", sourceUrl: "https://kaggle.com/datasets/jcsmnz/etsy-top-100", assetType: "dataset", title: "Etsy Top-100 Daily Snapshot 2024-2025", askingPriceUsd: null, monthlyRevenueUsd: null, license: "MIT", niche: "etsy_printable", notes: "Wraps perfectly into a $9/mo trend tracker.", status: "reviewing", createdAt: isoMinusDays(2) },
  { id: "asset_2", sourcePlatform: "plr_marketplace", sourceUrl: "https://plr.me/wellness-articles-50", assetType: "plr_pack", title: "PLR — 50 Wellness Articles Pack", askingPriceUsd: 47, monthlyRevenueUsd: null, license: "Resell rights, no master rights.", niche: "plr_pack", notes: "Refresh hooks and bundle as ebook.", status: "new", createdAt: isoMinusDays(5) },
  { id: "asset_3", sourcePlatform: "flippa", sourceUrl: "https://flippa.com/12345-etsy-shop", assetType: "expired_etsy", title: "Etsy Shop — Boho Wedding Printables", askingPriceUsd: 1800, monthlyRevenueUsd: 320, license: null, niche: "etsy_printable", notes: "Owner motivated; shop has 2k followers.", status: "negotiating", createdAt: isoMinusDays(3) },
  { id: "asset_4", sourcePlatform: "micro_acquire", sourceUrl: "https://acquire.com/listing/abc", assetType: "microacquire_listing", title: "Micro-SaaS — Twitter Schedule Tool", askingPriceUsd: 8500, monthlyRevenueUsd: 480, license: "Full IP transfer.", niche: "micro_saas", notes: "Tech debt acceptable; $480 MRR.", status: "reviewing", createdAt: isoMinusDays(8) },
  { id: "asset_5", sourcePlatform: "kaggle", sourceUrl: "https://kaggle.com/datasets/reddit-entrepreneur", assetType: "dataset", title: "Reddit r/entrepreneur Submissions Dataset", askingPriceUsd: null, monthlyRevenueUsd: null, license: "CC-BY 4.0", niche: "dataset", notes: "Slice into a daily trend digest.", status: "new", createdAt: isoMinusDays(1) },
  { id: "asset_6", sourcePlatform: "flippa", sourceUrl: "https://flippa.com/expired-domain-aestheticfinance", assetType: "expired_domain", title: "aestheticfinance.com — expired", askingPriceUsd: 220, monthlyRevenueUsd: null, license: null, niche: "etsy_printable", notes: "Brand fits the 'aesthetic finance' trend.", status: "passed", createdAt: isoMinusDays(10) },
  { id: "asset_7", sourcePlatform: "plr_marketplace", sourceUrl: "https://plr-master/affiliate-mega", assetType: "plr_pack", title: "PLR — Affiliate Marketing Mega Bundle", askingPriceUsd: 89, monthlyRevenueUsd: null, license: "Resell rights, branded edits OK.", niche: "plr_pack", notes: "Modernize for AI-era affiliate.", status: "acquired", createdAt: isoMinusDays(14) },
  { id: "asset_8", sourcePlatform: "kaggle", sourceUrl: "https://kaggle.com/datasets/sp500-earnings", assetType: "dataset", title: "S&P 500 Earnings Call Sentiment", askingPriceUsd: null, monthlyRevenueUsd: null, license: "MIT", niche: "dataset", notes: "Wrap behind an API for finance creators.", status: "new", createdAt: isoMinusDays(0) },
  { id: "asset_9", sourcePlatform: "flippa", sourceUrl: "https://flippa.com/etsy-shop-stickers", assetType: "expired_etsy", title: "Etsy Shop — Sticker Empire", askingPriceUsd: 4200, monthlyRevenueUsd: 720, license: null, niche: "etsy_printable", notes: "200+ active SKUs; pricing high.", status: "passed", createdAt: isoMinusDays(20) },
  { id: "asset_10", sourcePlatform: "micro_acquire", sourceUrl: "https://acquire.com/listing/def", assetType: "microacquire_listing", title: "Micro-SaaS — SEO Snapshot", askingPriceUsd: 12000, monthlyRevenueUsd: 600, license: "Full IP.", niche: "micro_saas", notes: "Stagnant for 6 months — re-launch potential.", status: "new", createdAt: isoMinusDays(6) },
  { id: "asset_11", sourcePlatform: "plr_marketplace", sourceUrl: "https://plr/budget-binder", assetType: "plr_pack", title: "PLR — Budget Binder Printable", askingPriceUsd: 28, monthlyRevenueUsd: null, license: "Resell rights, no master rights.", niche: "etsy_printable", notes: "Pair with KDP low-content version.", status: "reviewing", createdAt: isoMinusDays(11) },
  { id: "asset_12", sourcePlatform: "flippa", sourceUrl: "https://flippa.com/expired-domain-promptkeep", assetType: "expired_domain", title: "promptkeep.app — expired", askingPriceUsd: 380, monthlyRevenueUsd: null, license: null, niche: "browser_extension", notes: "Tied to the PromptKeep extension idea.", status: "reviewing", createdAt: isoMinusDays(4) },
];

// ----------------------------- Conversations + Messages -----------------------------

const conversationSeeds = [
  {
    id: "conv_1",
    userId: "user_andrei",
    brainMode: "global",
    title: "What should I build this weekend?",
    contextRefs: { opportunityIds: ["opportunity_1", "opportunity_4", "opportunity_7"] },
    messageCount: 10,
  },
  {
    id: "conv_2",
    userId: "user_andrei",
    brainMode: "opportunity",
    title: "Pressure-test: Notion second-brain replication",
    contextRefs: { opportunityIds: ["opportunity_2"] },
    messageCount: 8,
  },
  {
    id: "conv_3",
    userId: "user_andrei",
    brainMode: "creator",
    title: "Reverse-engineer Notion North playbook",
    contextRefs: { creatorIds: ["creator_2"] },
    messageCount: 9,
  },
  {
    id: "conv_4",
    userId: "user_editor",
    brainMode: "dataset_review",
    title: "Is the S&P earnings dataset worth wrapping?",
    contextRefs: { assetIds: ["asset_8"] },
    messageCount: 8,
  },
];

export const mockConversations: Conversation[] = conversationSeeds.map((c, i) => ({
  id: c.id,
  userId: c.userId,
  brainMode: c.brainMode,
  contextRefs: c.contextRefs,
  title: c.title,
  lastMessageAt: isoMinusHours(i + 1),
  messageCount: c.messageCount,
}));

const buildMessages = (conv: (typeof conversationSeeds)[number]): Message[] => {
  const messages: Message[] = [];
  const now = NOW.getTime();
  const turns: { role: "user" | "assistant"; content: string }[] = [];
  switch (conv.brainMode) {
    case "global":
      turns.push(
        { role: "user", content: "What should I build this weekend? I have ~16 hours." },
        { role: "assistant", content: "Three weekend-shaped bets jump out:\n\n1. **Etsy printable bundle for 'aesthetic finance'** — score 87. Search up 220% w/w, low competition pocket.\n2. **Notion template + Figma asset hybrid for podcast operators** — score 81. Repeat-buyer market.\n3. **AI prompt pack for cold outreach using Claude** — score 79.\n\nWant me to draft a one-pager for #1?" },
        { role: "user", content: "Yes — and tell me where the trademark risk is." },
        { role: "assistant", content: "Trademark risk: low. 'Aesthetic finance' is descriptive, not registered. Avoid Disney-adjacent illustrations. Steer clear of Apple's calculator UI clones in your mockups. Use original typography only.\n\nDrafting one-pager now..." },
        { role: "user", content: "What's the tier-2 monetization?" },
        { role: "assistant", content: "Tier 2: $19 'Editable Canva' upsell with 12 swap-in templates. Tier 3: $49 lifetime access to a private Notion dashboard with weekly drops. Margin holds because tier 3 is delivery-light." },
        { role: "user", content: "OK what's the win condition for week 1?" },
        { role: "assistant", content: "10 sales in week 1 = signal-fit. 5-star avg over 20 reviews. If <5 sales, kill the SKU and pivot to wedding-niche variant." },
        { role: "user", content: "Add it to my shortlist." },
        { role: "assistant", content: "Done. Shortlisted opportunity_1. I'll auto-update score nightly and ping you if any rule modifier flips." },
      );
      break;
    case "opportunity":
      turns.push(
        { role: "user", content: "Pressure-test the Notion second-brain replication idea. Where does it die?" },
        { role: "assistant", content: "It dies at distribution. The market has 50+ Notion templates ranking for 'second brain'. The mechanic-fit is strong, but the trust gap is hard.\n\nMitigation: ship a 'second brain for indie SaaS founders' niche cut, not generic. Distribution lever: free 5-page sample on a TikTok-friendly demo." },
        { role: "user", content: "Is the build effort tag of 'week' realistic?" },
        { role: "assistant", content: "If you bring an existing system, yes. From scratch, it's 12-16 days. The hard part isn't the database design, it's writing the documentation and recording the loom walkthroughs." },
        { role: "user", content: "Score breakdown — why is competition only 38?" },
        { role: "assistant", content: "Competition score 38 (out of 100, lower = more competition) reflects: 50+ existing templates, 5 in the same vertical, but most are visually outdated and lack a 'CRM lite' add-on which 60% of buyer comments request. So the *visible* competition is high, but the *quality-adjusted* competition is moderate." },
        { role: "user", content: "What's the one experiment I should run before committing 2 weeks?" },
        { role: "assistant", content: "Post a 60-second TikTok 'tour' of the prototype's weekly review screen with a Stan Store waitlist link. If it pulls 100+ waitlist in 72 hours → green light. If <30 → either reposition or kill." },
        { role: "user", content: "Lock it in. Mark it as 'building' but assigned to next sprint." },
        { role: "assistant", content: "Done — opportunity_2 marked 'building' with owner=you, sprint=next. I'll resurface in feed when momentum changes by ±10 points." },
      );
      break;
    case "creator":
      turns.push(
        { role: "user", content: "How does Notion North price their bundles?" },
        { role: "assistant", content: "Three tiers:\n- $9 single template\n- $39 'Founder OS' bundle (4 templates)\n- $129 'Lifetime All-Access' (everything + Discord)\n\nKeystone is the $39 bundle. They run it through a Pinterest funnel + a weekly TikTok tour." },
        { role: "user", content: "What's their posting cadence?" },
        { role: "assistant", content: "Every Tuesday: one new template release. Every Friday: a TikTok demo of an existing template. Discord weekly office hours on Thursdays. Email list gets the new template a day early — converts at ~6%." },
        { role: "user", content: "How do they handle support?" },
        { role: "assistant", content: "Discord-first. They use a #questions channel with a tagged 'community helper' role. Founder responds personally to bundle buyers within 24h. No chat support for $9 buyers." },
        { role: "user", content: "What's their differentiation moat?" },
        { role: "assistant", content: "Brand and bundle stacking. Their 'Founder OS' has a strong visual identity (editorial neutral palette, serif headers) that's hard to clone without looking derivative. Plus they bundle aggressively — 4 SKUs makes price comparison harder." },
        { role: "user", content: "What would *I* do differently?" },
        { role: "assistant", content: "Two things:\n1. Vertical-specific cuts (indie SaaS, agency, podcast) — they're horizontal-only.\n2. CRM-lite add-on — buyer comments request it, they don't ship it. That's a $19 upsell waiting." },
        { role: "user", content: "Save those two ideas as opportunities." },
        { role: "assistant", content: "Created two new opportunities, both linked to creator_2 as competitive context." },
      );
      break;
    case "dataset_review":
      turns.push(
        { role: "user", content: "Is the S&P earnings dataset worth wrapping?" },
        { role: "assistant", content: "Yes, conditionally. It's MIT-licensed and 4.2GB. The wrap-and-resell play:\n- Vertical: finance creators / hedge fund Substack writers\n- Format: $29/mo searchable webapp + weekly digest\n- Moat: the value is in the slicing UX, not the raw data" },
        { role: "user", content: "What's my distribution wedge?" },
        { role: "assistant", content: "FinTwit threads. Pick 5 'mispriced earnings reactions' per week from the dataset, post them as a chart-heavy thread on Tuesday + Wednesday. Each thread links to your tool. Aim for 3-5% conversion to free trial." },
        { role: "user", content: "What's the build effort?" },
        { role: "assistant", content: "Week-shaped if you skip ML enrichment. Month-shaped if you want sentiment scoring beyond the dataset's existing labels." },
        { role: "user", content: "How do I avoid SEC issues?" },
        { role: "assistant", content: "Surface raw data + factual signals only. Never editorialize or recommend 'buy/sell'. Add a clear disclaimer: 'Not investment advice.' Stay descriptive, not prescriptive. If you do thread examples, make them historical, not current-cycle." },
        { role: "user", content: "What pricing makes this work?" },
        { role: "assistant", content: "$29/mo solo, $79/mo team (3 seats), $299/mo enterprise (API access). Annual prepay 2 months free. Target $5k MRR by month 3." },
        { role: "user", content: "Let me think about it. Mark as 'reviewing'." },
        { role: "assistant", content: "Done — asset_8 marked 'reviewing' with owner=you. I'll resurface if a similar dataset gets wrapped publicly in the next 30 days." },
      );
      break;
    default:
      turns.push({ role: "user", content: "Hello" }, { role: "assistant", content: "Hi! How can I help?" });
  }
  turns.forEach((turn, idx) => {
    messages.push({
      id: `msg_${conv.id}_${idx + 1}`,
      conversationId: conv.id,
      role: turn.role,
      content: turn.content,
      createdAt: new Date(now - (turns.length - idx) * 90_000).toISOString(),
    });
  });
  return messages;
};

export const mockMessages: Message[] = conversationSeeds.flatMap((c) => buildMessages(c));

// ----------------------------- Activity log -----------------------------

const activityActions = [
  { action: "vote", entity: "opportunity", payload: { direction: "up" } },
  { action: "save", entity: "opportunity", payload: { saved: true } },
  { action: "build", entity: "opportunity", payload: { status: "building" } },
  { action: "abandon", entity: "opportunity", payload: { status: "abandoned" } },
  { action: "annotation", entity: "opportunity", payload: { length: 64 } },
  { action: "rule_create", entity: "rule", payload: { ruleType: "boost" } },
  { action: "source_toggle", entity: "source", payload: { enabled: true } },
  { action: "crawl_run", entity: "source", payload: { items: 18 } },
  { action: "digest_send", entity: "digest", payload: { cadence: "daily" } },
  { action: "brain_chat", entity: "conversation", payload: { messages: 1 } },
];

export const mockActivity: ActivityEntry[] = Array.from({ length: 25 }).map((_, i) => {
  const tmpl = activityActions[i % activityActions.length] as (typeof activityActions)[number];
  const user = mockUsers[i % mockUsers.length] as MockUser;
  const targetId =
    tmpl.entity === "opportunity"
      ? mockOpportunities[i % mockOpportunities.length]?.id ?? "opportunity_1"
      : tmpl.entity === "rule"
      ? mockGoldenRules[i % mockGoldenRules.length]?.id ?? "rule_1"
      : tmpl.entity === "source"
      ? mockSources[i % mockSources.length]?.id ?? "source_etsy"
      : tmpl.entity === "digest"
      ? mockDigests[i % mockDigests.length]?.id ?? "digest_daily_1"
      : mockConversations[i % mockConversations.length]?.id ?? "conv_1";
  return {
    id: `activity_${i + 1}`,
    userId: user.id,
    userName: user.name,
    action: tmpl.action,
    entityType: tmpl.entity,
    entityId: targetId,
    payload: tmpl.payload,
    createdAt: isoMinusHours(i * 2 + 1),
  };
});

// ----------------------------- KPIs -----------------------------

export const mockKpis: DashboardKpis = {
  newOpportunities24h: mockOpportunities.filter(
    (o) => new Date(o.createdAt).getTime() > NOW.getTime() - 86_400_000,
  ).length,
  trendingNiches: mockTrends.filter((t) => t.growthPct > 15).length,
  activeBuilds: mockOpportunities.filter((o) => o.status === "building").length,
  totalProjectedRevenue: mockOpportunities
    .filter((o) => ["shortlisted", "building"].includes(o.status))
    .reduce((sum, o) => sum + o.projectedRevenueUsd, 0),
  avgScore: Math.round(
    mockOpportunities.reduce((sum, o) => sum + o.score, 0) / Math.max(1, mockOpportunities.length),
  ),
  scoreSparkline: Array.from({ length: 14 }).map((_, i) => ({
    date: isoMinusDays(13 - i),
    value: Math.round(50 + det(i + 199) * 30 + i * 1.4),
  })),
};

// ----------------------------- Helpers -----------------------------

export function findOpportunity(id: string) {
  return mockOpportunities.find((o) => o.id === id);
}
export function findProduct(id: string) {
  return mockProducts.find((p) => p.id === id);
}
export function findCreator(id: string) {
  return mockCreators.find((c) => c.id === id);
}
export function findNiche(slug: string) {
  return mockNiches.find((n) => n.slug === slug);
}
export function findResellable(id: string) {
  return mockResellable.find((r) => r.id === id);
}
export function findConversation(id: string) {
  return mockConversations.find((c) => c.id === id);
}
export function findUserByEmail(email: string) {
  return mockUsers.find((u) => u.email.toLowerCase() === email.toLowerCase());
}
export function findUserById(id: string) {
  return mockUsers.find((u) => u.id === id);
}
export function messagesFor(conversationId: string) {
  return mockMessages.filter((m) => m.conversationId === conversationId);
}
