-- Minimal DDL mirroring the tables the webhook writes to (with this change applied).
CREATE TABLE workspace(id text PRIMARY KEY,"remainingMonths" int);
CREATE TABLE "order"(id text PRIMARY KEY,"workspaceId" text NOT NULL REFERENCES workspace(id),"completedAt" timestamptz);
