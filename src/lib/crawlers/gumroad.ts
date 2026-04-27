import { makeStub } from "./_stub";
// Gumroad Discover has no public API — requires headless. Phase I plugs in Apify.
const gumroad = makeStub("gumroad", { requiresHeadless: true });
export default gumroad;
