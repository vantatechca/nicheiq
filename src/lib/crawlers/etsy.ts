import { makeStub } from "./_stub";
// Etsy browse APIs require OAuth + sales-channel approval; without it we route through
// a headless adapter (Apify / ScrapingBee / Bright Data). Wired in Phase I.
const etsy = makeStub("etsy", { requiresHeadless: true });
export default etsy;
