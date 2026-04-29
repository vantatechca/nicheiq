import { defineConfig } from "drizzle-kit";

// drizzle-kit auto-loads .env files since v0.20+

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is not set. drizzle-kit needs a real connection string — set it in .env.local or your shell env.",
  );
}

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: databaseUrl },
  strict: true,
  verbose: true,
});