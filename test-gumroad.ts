import envato from "./src/lib/crawlers/envato";

async function test() {
  console.log("Running Envato crawler...\n");

  const raw     = await envato.crawl({ config: { site: "graphicriver.net", term: "template", sortBy: "trending" } });
  const parsed  = envato.parse(raw);
  const signals = envato.normalize(parsed);

  console.log(`Signals found: ${signals.length}\n`);

  for (const s of signals.slice(0, 5)) {
    console.log("─────────────────────────");
    console.log("Title:   ", s.title);
    console.log("Price:   $" + s.priceUsd);
    console.log("Sales:   ", s.estMonthlySales?.high);
    console.log("Creator: ", s.creator?.handle);
    console.log("URL:     ", s.sourceUrl);
    console.log();
  }
}

test().catch(console.error);