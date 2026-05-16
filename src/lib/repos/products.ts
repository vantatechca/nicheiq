import { desc } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { products } from "@/lib/db/schema";
import { mockProducts } from "@/mock/data";
import { isMockMode } from "./mode";

/** Top products by estimated monthly revenue. Used by the digest generator. */
export async function getTopProducts(limit = 5) {
  if (isMockMode()) {
    return mockProducts
      .slice()
      .sort((a, b) => (b.estMonthlyRevenueHigh ?? 0) - (a.estMonthlyRevenueHigh ?? 0))
      .slice(0, limit);
  }
  const db = getDb();
  return db
    .select()
    .from(products)
    .orderBy(desc(products.estMonthlyRevenueHigh))
    .limit(limit);
}