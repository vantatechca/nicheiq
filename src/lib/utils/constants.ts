import {
  Activity,
  BarChart3,
  Bot,
  Boxes,
  Briefcase,
  Compass,
  Database,
  FlaskConical,
  Gauge,
  Lightbulb,
  Mail,
  type LucideIcon,
  Newspaper,
  Package,
  Settings,
  Shield,
  Sparkles,
  Store,
  TrendingUp,
  Users,
  Workflow,
} from "lucide-react";

export const APP_NAME = "NicheIQ";
export const APP_TAGLINE = "Bloomberg Terminal for digital product opportunities";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  group: "core" | "discover" | "operate" | "system";
  badge?: string;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: Gauge, group: "core" },
  { href: "/feed", label: "Live feed", icon: Activity, group: "core", badge: "live" },
  { href: "/brain", label: "Brain", icon: Sparkles, group: "core" },
  { href: "/opportunities", label: "Opportunities", icon: Lightbulb, group: "discover" },
  { href: "/products", label: "Products", icon: Package, group: "discover" },
  { href: "/creators", label: "Creators", icon: Users, group: "discover" },
  { href: "/niches", label: "Niches", icon: Compass, group: "discover" },
  { href: "/trends", label: "Trends", icon: TrendingUp, group: "discover" },
  { href: "/competitors", label: "Competitors", icon: Briefcase, group: "discover" },
  { href: "/resellable", label: "Resellable", icon: Boxes, group: "discover" },
  { href: "/sources", label: "Sources", icon: Store, group: "operate" },
  { href: "/rules", label: "Golden rules", icon: Shield, group: "operate" },
  { href: "/digest", label: "Digest", icon: Mail, group: "operate" },
  { href: "/analytics", label: "Analytics", icon: BarChart3, group: "operate" },
  { href: "/settings", label: "Settings", icon: Settings, group: "system" },
];

export const NAV_GROUPS: Record<NavItem["group"], string> = {
  core: "Workspace",
  discover: "Discover",
  operate: "Operate",
  system: "System",
};

export const SOURCE_PLATFORMS = [
  { value: "etsy", label: "Etsy", category: "marketplace", icon: "🧵" },
  { value: "gumroad", label: "Gumroad", category: "marketplace", icon: "🛒" },
  { value: "creative_market", label: "Creative Market", category: "marketplace", icon: "🎨" },
  { value: "envato", label: "Envato", category: "marketplace", icon: "🌿" },
  { value: "design_bundles", label: "Design Bundles", category: "marketplace", icon: "🎁" },
  { value: "kdp", label: "Amazon KDP", category: "marketplace", icon: "📚" },
  { value: "redbubble", label: "Redbubble", category: "marketplace", icon: "🎽" },
  { value: "shopify_app_store", label: "Shopify App Store", category: "marketplace", icon: "🛍" },
  { value: "notion_marketplace", label: "Notion Marketplace", category: "marketplace", icon: "📝" },
  { value: "whop", label: "Whop", category: "marketplace", icon: "🎟" },
  { value: "sellfy", label: "Sellfy", category: "marketplace", icon: "🏪" },
  { value: "payhip", label: "Payhip", category: "marketplace", icon: "💸" },
  { value: "stan", label: "Stan Store", category: "marketplace", icon: "⭐" },
  { value: "lemonsqueezy", label: "Lemon Squeezy", category: "marketplace", icon: "🍋" },
  { value: "patreon", label: "Patreon", category: "marketplace", icon: "🎭" },
  { value: "skool", label: "Skool", category: "marketplace", icon: "🏛" },
  { value: "teachers_pay_teachers", label: "Teachers Pay Teachers", category: "marketplace", icon: "🍎" },
  { value: "google_trends", label: "Google Trends", category: "trend", icon: "📈" },
  { value: "tiktok", label: "TikTok", category: "trend", icon: "🎵" },
  { value: "pinterest", label: "Pinterest", category: "trend", icon: "📌" },
  { value: "reddit", label: "Reddit", category: "trend", icon: "🤖" },
  { value: "youtube", label: "YouTube", category: "trend", icon: "📺" },
  { value: "twitter", label: "Twitter / X", category: "trend", icon: "🐦" },
  { value: "product_hunt", label: "Product Hunt", category: "trend", icon: "🚀" },
  { value: "hacker_news", label: "Hacker News", category: "trend", icon: "📰" },
  { value: "indie_hackers", label: "Indie Hackers", category: "trend", icon: "👨‍💻" },
  { value: "exploding_topics", label: "Exploding Topics", category: "trend", icon: "💥" },
  { value: "kaggle", label: "Kaggle", category: "asset", icon: "📊" },
  { value: "aws_data_exchange", label: "AWS Data Exchange", category: "asset", icon: "☁️" },
  { value: "data_world", label: "data.world", category: "asset", icon: "🌐" },
  { value: "data_gov", label: "data.gov", category: "asset", icon: "🏛" },
  { value: "rapidapi", label: "RapidAPI", category: "asset", icon: "⚡" },
  { value: "plr_marketplace", label: "PLR Marketplaces", category: "asset", icon: "📦" },
  { value: "flippa", label: "Flippa", category: "asset", icon: "💼" },
  { value: "micro_acquire", label: "MicroAcquire", category: "asset", icon: "🤝" },
  { value: "empire_flippers", label: "Empire Flippers", category: "asset", icon: "🏰" },
  { value: "custom", label: "Custom", category: "asset", icon: "🔧" },
] as const;

export type SourcePlatform = (typeof SOURCE_PLATFORMS)[number]["value"];

export const NICHE_LIST = [
  { value: "print_on_demand", label: "Print-on-demand", parent: null },
  { value: "etsy_printable", label: "Etsy printables", parent: null },
  { value: "notion_template", label: "Notion templates", parent: null },
  { value: "gumroad_ebook", label: "Gumroad ebooks", parent: null },
  { value: "kdp_low_content", label: "KDP low-content books", parent: null },
  { value: "course", label: "Online courses", parent: null },
  { value: "ai_prompt_pack", label: "AI prompt packs", parent: null },
  { value: "figma_kit", label: "Figma UI kits", parent: null },
  { value: "wordpress_theme", label: "WordPress themes", parent: null },
  { value: "shopify_app", label: "Shopify apps", parent: null },
  { value: "lightroom_preset", label: "Lightroom presets", parent: null },
  { value: "sample_pack", label: "Audio sample packs", parent: null },
  { value: "video_template", label: "Video templates", parent: null },
  { value: "dataset", label: "Datasets", parent: null },
  { value: "plr_pack", label: "PLR packs", parent: null },
  { value: "micro_saas", label: "Micro-SaaS", parent: null },
  { value: "browser_extension", label: "Browser extensions", parent: null },
  { value: "discord_bot", label: "Discord bots", parent: null },
  { value: "game_asset", label: "Game assets", parent: null },
  { value: "other", label: "Other", parent: null },
] as const;

export type NicheValue = (typeof NICHE_LIST)[number]["value"];

export const OPPORTUNITY_TYPES = [
  { value: "trend_play", label: "Trend play", description: "Capitalize on a rising query before saturation" },
  { value: "replication", label: "Replication", description: "Replicate a proven seller with a twist" },
  { value: "repackage_resell", label: "Repackage & resell", description: "License an asset and rebundle for a niche" },
  { value: "niche_expansion", label: "Niche expansion", description: "Take a winning concept into an adjacent niche" },
  { value: "micro_saas", label: "Micro-SaaS", description: "Wrap an API or workflow into a paid tool" },
  { value: "plr_remix", label: "PLR remix", description: "Use private-label rights content as a base" },
  { value: "dataset_wrap", label: "Dataset wrap", description: "Package a dataset behind an API or UI" },
] as const;

export const BUILD_EFFORTS = [
  { value: "weekend", label: "Weekend", days: 2, weight: 100 },
  { value: "week", label: "1 week", days: 7, weight: 80 },
  { value: "month", label: "1 month", days: 30, weight: 55 },
  { value: "quarter", label: "1 quarter", days: 90, weight: 30 },
  { value: "year_plus", label: "Year+", days: 365, weight: 10 },
] as const;

export const PRODUCT_STATUSES = [
  { value: "tracking", label: "Tracking", color: "slate" },
  { value: "shortlisted", label: "Shortlisted", color: "blue" },
  { value: "building", label: "Building", color: "amber" },
  { value: "launched", label: "Launched", color: "green" },
  { value: "abandoned", label: "Abandoned", color: "red" },
  { value: "archived", label: "Archived", color: "zinc" },
] as const;

export const RESELLABLE_STATUSES = [
  { value: "new", label: "New" },
  { value: "reviewing", label: "Reviewing" },
  { value: "negotiating", label: "Negotiating" },
  { value: "acquired", label: "Acquired" },
  { value: "passed", label: "Passed" },
] as const;

export const BRAIN_MODES = [
  { value: "global", label: "Global", description: "Survey the whole portfolio" },
  { value: "niche", label: "Niche deep-dive", description: "Focus on one category" },
  { value: "opportunity", label: "Opportunity", description: "Pressure-test a single bet" },
  { value: "creator", label: "Creator playbook", description: "Reverse-engineer a top seller" },
  { value: "build_plan", label: "Build plan", description: "Draft a build roadmap" },
  { value: "replicate", label: "Replicate", description: "Differentiate a proven product" },
  { value: "dataset_review", label: "Dataset review", description: "Evaluate a resellable asset" },
] as const;

export const SCORE_BUCKETS = [
  { min: 80, max: 100, label: "Strong", color: "emerald", glow: "shadow-emerald-500/30" },
  { min: 60, max: 79, label: "Promising", color: "sky", glow: "shadow-sky-500/30" },
  { min: 40, max: 59, label: "Watch", color: "amber", glow: "shadow-amber-500/30" },
  { min: 20, max: 39, label: "Weak", color: "orange", glow: "shadow-orange-500/30" },
  { min: 0, max: 19, label: "Skip", color: "rose", glow: "shadow-rose-500/30" },
] as const;

export function bucketForScore(score: number) {
  return SCORE_BUCKETS.find((b) => score >= b.min && score <= b.max) ?? SCORE_BUCKETS[2];
}

export const SCORE_DIMENSIONS = [
  { key: "demand", label: "Demand", weight: 0.25, icon: TrendingUp },
  { key: "competition", label: "Competition (inv.)", weight: 0.2, icon: Shield },
  { key: "revenue", label: "Revenue potential", weight: 0.25, icon: BarChart3 },
  { key: "buildEffort", label: "Build effort (inv.)", weight: 0.15, icon: Workflow },
  { key: "trend", label: "Trend momentum", weight: 0.15, icon: Activity },
] as const;

export const DIGEST_CADENCES = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "on_demand", label: "On demand" },
] as const;

export const ACTIVITY_ICONS: Record<string, LucideIcon> = {
  vote: Activity,
  save: Lightbulb,
  build: Workflow,
  abandon: FlaskConical,
  brain: Bot,
  digest: Mail,
  rule: Shield,
  source: Store,
  crawl: Database,
  default: Newspaper,
};
