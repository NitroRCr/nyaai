ALTER TABLE "entity" ADD COLUMN "search" tsvector GENERATED ALWAYS AS (to_tsvector('mixed', "entity"."name")) STORED;--> statement-breakpoint
ALTER TABLE "item" ADD COLUMN "search" tsvector GENERATED ALWAYS AS (to_tsvector('mixed', "item"."text")) STORED;--> statement-breakpoint
ALTER TABLE "message" ADD COLUMN "search" tsvector GENERATED ALWAYS AS (to_tsvector('mixed', "message"."text")) STORED;--> statement-breakpoint
ALTER TABLE "page" ADD COLUMN "text" text;--> statement-breakpoint
ALTER TABLE "page" ADD COLUMN "search" tsvector GENERATED ALWAYS AS (to_tsvector('mixed', "page"."text")) STORED;--> statement-breakpoint
ALTER TABLE "translationRecord" ADD COLUMN "search" tsvector GENERATED ALWAYS AS (to_tsvector('mixed', coalesce("translationRecord"."input", '') || ' ' || coalesce("translationRecord"."output", ''))) STORED;