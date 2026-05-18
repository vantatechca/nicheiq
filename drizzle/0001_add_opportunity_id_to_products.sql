-- Adds the "opportunity_id" column to products.
--
-- NULL means the row is a competitor product (promoted from a signal for
-- market intelligence). NOT NULL means the row is YOUR shipped product,
-- created when an opportunity's status flips to "launched".
--
-- ON DELETE SET NULL: if the parent opportunity gets deleted, the product
-- row survives with NULL opportunity_id rather than disappearing. The
-- product is still real even if the planning artifact is gone.

ALTER TABLE "products" ADD COLUMN "opportunity_id" text;
--> statement-breakpoint
ALTER TABLE "products"
  ADD CONSTRAINT "products_opportunity_id_fkey"
  FOREIGN KEY ("opportunity_id") REFERENCES "opportunities"("id")
  ON DELETE SET NULL ON UPDATE NO ACTION;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_opportunity_idx" ON "products"("opportunity_id");