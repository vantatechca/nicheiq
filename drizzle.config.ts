import { defineConfig } from "drizzle-kit";

// drizzle-kit auto-loads .env files since v0.20+


export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgresql://neondb_owner:npg_FacwDn2y9EhZ@ep-square-leaf-ans3cal9-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
  },
  strict: true,
  verbose: true,
});
