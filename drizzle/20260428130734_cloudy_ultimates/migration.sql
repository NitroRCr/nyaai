ALTER TABLE "entity" ADD COLUMN "search" tsvector GENERATED ALWAYS AS (to_tsvector('mixed', left("entity"."name", 250000))) STORED;--> statement-breakpoint
ALTER TABLE "item" ADD COLUMN "search" tsvector GENERATED ALWAYS AS (to_tsvector('mixed', left("item"."text", 250000))) STORED;--> statement-breakpoint
ALTER TABLE "message" ADD COLUMN "search" tsvector GENERATED ALWAYS AS (to_tsvector('mixed', left("message"."text", 250000))) STORED;--> statement-breakpoint
ALTER TABLE "page" ADD COLUMN "text" text;--> statement-breakpoint
ALTER TABLE "page" ADD COLUMN "search" tsvector GENERATED ALWAYS AS (to_tsvector('mixed', left("page"."text", 250000))) STORED;--> statement-breakpoint
ALTER TABLE "translationRecord" ADD COLUMN "search" tsvector GENERATED ALWAYS AS (to_tsvector('mixed', left(coalesce("translationRecord"."input", '') || ' ' || coalesce("translationRecord"."output", ''), 250000))) STORED;