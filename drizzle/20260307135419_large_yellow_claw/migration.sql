CREATE TABLE "assistant" (
	"id" varchar(16) PRIMARY KEY,
	"rootId" varchar(16) NOT NULL,
	"prompt" text,
	"promptTemplate" text NOT NULL,
	"promptRole" text NOT NULL,
	"contextNum" integer,
	"streamSettings" jsonb NOT NULL,
	"plugins" jsonb NOT NULL,
	"modelId" varchar(16)
);
--> statement-breakpoint
CREATE TABLE "blob" (
	"id" varchar(16) PRIMARY KEY,
	"sha256" text NOT NULL,
	"sha256Proof" text NOT NULL,
	"size" bigint NOT NULL,
	"refCount" integer NOT NULL,
	CONSTRAINT "blob_sha256_sha256Proof_size_unique" UNIQUE("sha256","sha256Proof","size")
);
--> statement-breakpoint
CREATE TABLE "channel" (
	"id" varchar(16) PRIMARY KEY,
	"rootId" varchar(16) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat" (
	"id" varchar(16) PRIMARY KEY,
	"rootId" varchar(16) NOT NULL,
	"msgTree" jsonb NOT NULL,
	"msgRoute" jsonb NOT NULL,
	"plugins" jsonb,
	"modelId" varchar(16)
);
--> statement-breakpoint
CREATE TABLE "entity" (
	"id" varchar(16) PRIMARY KEY,
	"rootId" varchar(16) NOT NULL,
	"parentId" varchar(16),
	"type" text NOT NULL,
	"name" text,
	"avatar" jsonb,
	"conf" jsonb NOT NULL,
	"sortPriority" integer NOT NULL,
	"hidden" boolean NOT NULL,
	"pubRoot" varchar(16),
	CONSTRAINT "entity_rootId_id_unique" UNIQUE("rootId","id")
);
--> statement-breakpoint
CREATE TABLE "entityAccess" (
	"userId" text,
	"entityId" varchar(16),
	"time" timestamp NOT NULL,
	CONSTRAINT "entityAccess_pkey" PRIMARY KEY("entityId","userId")
);
--> statement-breakpoint
CREATE TABLE "globalSettings" (
	"id" text PRIMARY KEY,
	"defaultChatModel" varchar(16),
	"defaultChatTitleModel" varchar(16),
	"defaultTranslationModel" varchar(16),
	"defaultSearchChatModel" varchar(16),
	"freeModelReqLimit" integer NOT NULL,
	"freeModelLimitWindow" integer NOT NULL,
	"maxWorkspacesPerUser" integer NOT NULL,
	"oauthProviders" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "item" (
	"id" varchar(16) PRIMARY KEY,
	"rootId" varchar(16) NOT NULL,
	"text" text,
	"language" text,
	"blobId" varchar(16),
	"mimeType" text
);
--> statement-breakpoint
CREATE TABLE "mcpPlugin" (
	"id" varchar(16) PRIMARY KEY,
	"rootId" varchar(16) NOT NULL,
	"enabled" boolean NOT NULL,
	"transport" jsonb NOT NULL,
	"requestTimeout" integer,
	"resetTimeoutOnProgress" boolean,
	"keepAliveTimeout" integer
);
--> statement-breakpoint
CREATE TABLE "member" (
	"id" varchar(16) PRIMARY KEY,
	"workspaceId" varchar(16) NOT NULL,
	"userId" text NOT NULL,
	"role" text NOT NULL,
	"leftDirId" varchar(16)
);
--> statement-breakpoint
CREATE TABLE "mergePatchesRule" (
	"id" serial PRIMARY KEY,
	"offset" bigint NOT NULL,
	"interval" bigint NOT NULL,
	"gap" bigint NOT NULL,
	"lastTime" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "message" (
	"id" varchar(16) PRIMARY KEY,
	"rootId" varchar(16) NOT NULL,
	"type" text NOT NULL,
	"assistantId" varchar(16),
	"userId" text,
	"sentAt" timestamp,
	"editedAt" timestamp,
	"entityId" varchar(16) NOT NULL,
	"text" text NOT NULL,
	"reasoning" text,
	"error" text,
	"warnings" jsonb,
	"usage" jsonb,
	"modelName" text,
	CONSTRAINT "message_rootId_id_unique" UNIQUE("rootId","id")
);
--> statement-breakpoint
CREATE TABLE "messageEntity" (
	"rootId" varchar(16) NOT NULL,
	"messageId" varchar(16),
	"entityId" varchar(16),
	CONSTRAINT "messageEntity_pkey" PRIMARY KEY("messageId","entityId")
);
--> statement-breakpoint
CREATE TABLE "model" (
	"id" varchar(16) PRIMARY KEY,
	"rootId" varchar(16) NOT NULL,
	"entityId" varchar(16) NOT NULL,
	"name" text NOT NULL,
	"label" text,
	"caption" text,
	"avatar" jsonb,
	"inputTypes" jsonb,
	"settings" jsonb NOT NULL,
	"inputPrice" real,
	"outputPrice" real
);
--> statement-breakpoint
CREATE TABLE "order" (
	"id" varchar(16) PRIMARY KEY,
	"workspaceId" varchar(16) NOT NULL,
	"planId" text NOT NULL,
	"planInterval" text NOT NULL,
	"provider" jsonb NOT NULL,
	"amount" numeric(10,2) NOT NULL,
	"completedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "page" (
	"id" varchar(16) PRIMARY KEY,
	"rootId" varchar(16) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pagePatch" (
	"id" varchar(16) PRIMARY KEY,
	"rootId" varchar(16) NOT NULL,
	"entityId" varchar(16) NOT NULL,
	"patch" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plan" (
	"id" text PRIMARY KEY,
	"name" text NOT NULL,
	"maxMembers" integer NOT NULL,
	"storageLimit" bigint NOT NULL,
	"fileSizeLimit" bigint NOT NULL,
	"quotaLimit" double precision NOT NULL
);
--> statement-breakpoint
CREATE TABLE "planPrice" (
	"id" varchar(16) PRIMARY KEY,
	"enabled" boolean NOT NULL,
	"planId" text NOT NULL,
	"provider" text NOT NULL,
	"interval" text NOT NULL,
	"amount" numeric(10,2) NOT NULL,
	"priceId" text
);
--> statement-breakpoint
CREATE TABLE "provider" (
	"id" varchar(16) PRIMARY KEY,
	"rootId" varchar(16) NOT NULL,
	"type" text NOT NULL,
	"settings" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "search" (
	"id" varchar(16) PRIMARY KEY,
	"rootId" varchar(16) NOT NULL,
	"currentIndex" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "searchRecord" (
	"id" varchar(16) PRIMARY KEY,
	"rootId" varchar(16) NOT NULL,
	"entityId" varchar(16) NOT NULL,
	"q" text NOT NULL,
	"results" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shortcut" (
	"id" varchar(16) PRIMARY KEY,
	"rootId" varchar(16) NOT NULL,
	"dirId" varchar(16),
	"type" text,
	"action" text
);
--> statement-breakpoint
CREATE TABLE "toolCall" (
	"id" varchar(16) PRIMARY KEY,
	"rootId" varchar(16) NOT NULL,
	"pluginId" varchar(16) NOT NULL,
	"messageId" varchar(16) NOT NULL,
	"name" text NOT NULL,
	"input" jsonb NOT NULL,
	"result" jsonb,
	"status" text NOT NULL,
	"error" text
);
--> statement-breakpoint
CREATE TABLE "translation" (
	"id" varchar(16) PRIMARY KEY,
	"rootId" varchar(16) NOT NULL,
	"currentIndex" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "translationRecord" (
	"id" varchar(16) PRIMARY KEY,
	"rootId" varchar(16) NOT NULL,
	"entityId" varchar(16) NOT NULL,
	"input" text,
	"output" text,
	"from" text,
	"to" text
);
--> statement-breakpoint
CREATE TABLE "usage" (
	"id" varchar(16) PRIMARY KEY,
	"workspaceId" varchar(16) NOT NULL,
	"userId" text NOT NULL,
	"modelName" text NOT NULL,
	"cost" real NOT NULL,
	"details" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "userData" (
	"id" text PRIMARY KEY,
	"lastWorkspaceId" varchar(16),
	"perfs" jsonb NOT NULL,
	"data" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspace" (
	"id" varchar(16) PRIMARY KEY,
	"name" text NOT NULL,
	"avatar" jsonb,
	"ownerId" text NOT NULL,
	"planId" text NOT NULL,
	"quotaUsed" double precision NOT NULL,
	"resetAt" timestamp NOT NULL,
	"remainingMonths" integer,
	"payment" jsonb,
	"storageUsed" bigint NOT NULL,
	"trashId" varchar(16) NOT NULL,
	"perfs" jsonb NOT NULL,
	"defaultLeftDirId" varchar(16)
);
--> statement-breakpoint
CREATE TABLE "workspaceInvitation" (
	"token" varchar(16) PRIMARY KEY,
	"workspaceId" varchar(16) NOT NULL,
	"inviterId" text NOT NULL,
	"role" text NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"remainingSeats" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL UNIQUE,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"impersonated_by" text
);
--> statement-breakpoint
CREATE TABLE "two_factor" (
	"id" text PRIMARY KEY,
	"secret" text NOT NULL,
	"backup_codes" text NOT NULL,
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY,
	"name" text NOT NULL,
	"email" text NOT NULL UNIQUE,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"role" text,
	"banned" boolean DEFAULT false,
	"ban_reason" text,
	"ban_expires" timestamp,
	"two_factor_enabled" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE INDEX "entity_parentId_index" ON "entity" ("parentId");--> statement-breakpoint
CREATE INDEX "entity_hidden_index" ON "entity" ("hidden");--> statement-breakpoint
CREATE INDEX "entityAccess_userId_time_index" ON "entityAccess" ("userId","time" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "member_workspaceId_index" ON "member" ("workspaceId");--> statement-breakpoint
CREATE INDEX "member_userId_index" ON "member" ("userId");--> statement-breakpoint
CREATE INDEX "message_entityId_index" ON "message" ("entityId");--> statement-breakpoint
CREATE INDEX "model_entityId_index" ON "model" ("entityId");--> statement-breakpoint
CREATE INDEX "order_workspaceId_index" ON "order" ("workspaceId");--> statement-breakpoint
CREATE INDEX "pagePatch_entityId_index" ON "pagePatch" ("entityId");--> statement-breakpoint
CREATE INDEX "searchRecord_entityId_index" ON "searchRecord" ("entityId");--> statement-breakpoint
CREATE INDEX "toolCall_messageId_index" ON "toolCall" ("messageId");--> statement-breakpoint
CREATE INDEX "translationRecord_entityId_index" ON "translationRecord" ("entityId");--> statement-breakpoint
CREATE INDEX "usage_workspaceId_index" ON "usage" ("workspaceId");--> statement-breakpoint
CREATE INDEX "workspace_ownerId_index" ON "workspace" ("ownerId");--> statement-breakpoint
CREATE INDEX "workspace_trashId_index" ON "workspace" ("trashId");--> statement-breakpoint
CREATE INDEX "workspaceInvitation_workspaceId_index" ON "workspaceInvitation" ("workspaceId");--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" ("user_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" ("user_id");--> statement-breakpoint
CREATE INDEX "twoFactor_secret_idx" ON "two_factor" ("secret");--> statement-breakpoint
CREATE INDEX "twoFactor_userId_idx" ON "two_factor" ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" ("identifier");--> statement-breakpoint
ALTER TABLE "assistant" ADD CONSTRAINT "assistant_modelId_model_id_fkey" FOREIGN KEY ("modelId") REFERENCES "model"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "assistant" ADD CONSTRAINT "assistant_rootId_id_entity_rootId_id_fkey" FOREIGN KEY ("rootId","id") REFERENCES "entity"("rootId","id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "channel" ADD CONSTRAINT "channel_rootId_id_entity_rootId_id_fkey" FOREIGN KEY ("rootId","id") REFERENCES "entity"("rootId","id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "chat" ADD CONSTRAINT "chat_modelId_model_id_fkey" FOREIGN KEY ("modelId") REFERENCES "model"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "chat" ADD CONSTRAINT "chat_rootId_id_entity_rootId_id_fkey" FOREIGN KEY ("rootId","id") REFERENCES "entity"("rootId","id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "entity" ADD CONSTRAINT "entity_rootId_parentId_entity_rootId_id_fkey" FOREIGN KEY ("rootId","parentId") REFERENCES "entity"("rootId","id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "entityAccess" ADD CONSTRAINT "entityAccess_userId_user_id_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "entityAccess" ADD CONSTRAINT "entityAccess_entityId_entity_id_fkey" FOREIGN KEY ("entityId") REFERENCES "entity"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "globalSettings" ADD CONSTRAINT "globalSettings_defaultChatModel_model_id_fkey" FOREIGN KEY ("defaultChatModel") REFERENCES "model"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "globalSettings" ADD CONSTRAINT "globalSettings_defaultChatTitleModel_model_id_fkey" FOREIGN KEY ("defaultChatTitleModel") REFERENCES "model"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "globalSettings" ADD CONSTRAINT "globalSettings_defaultTranslationModel_model_id_fkey" FOREIGN KEY ("defaultTranslationModel") REFERENCES "model"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "globalSettings" ADD CONSTRAINT "globalSettings_defaultSearchChatModel_model_id_fkey" FOREIGN KEY ("defaultSearchChatModel") REFERENCES "model"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "item" ADD CONSTRAINT "item_blobId_blob_id_fkey" FOREIGN KEY ("blobId") REFERENCES "blob"("id");--> statement-breakpoint
ALTER TABLE "item" ADD CONSTRAINT "item_rootId_id_entity_rootId_id_fkey" FOREIGN KEY ("rootId","id") REFERENCES "entity"("rootId","id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "mcpPlugin" ADD CONSTRAINT "mcpPlugin_rootId_id_entity_rootId_id_fkey" FOREIGN KEY ("rootId","id") REFERENCES "entity"("rootId","id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_workspaceId_workspace_id_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_userId_user_id_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_leftDirId_entity_id_fkey" FOREIGN KEY ("leftDirId") REFERENCES "entity"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "message" ADD CONSTRAINT "message_assistantId_assistant_id_fkey" FOREIGN KEY ("assistantId") REFERENCES "assistant"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "message" ADD CONSTRAINT "message_userId_user_id_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "message" ADD CONSTRAINT "message_rootId_entityId_entity_rootId_id_fkey" FOREIGN KEY ("rootId","entityId") REFERENCES "entity"("rootId","id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "messageEntity" ADD CONSTRAINT "messageEntity_entityId_entity_id_fkey" FOREIGN KEY ("entityId") REFERENCES "entity"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "messageEntity" ADD CONSTRAINT "messageEntity_rootId_messageId_message_rootId_id_fkey" FOREIGN KEY ("rootId","messageId") REFERENCES "message"("rootId","id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "model" ADD CONSTRAINT "model_rootId_entityId_entity_rootId_id_fkey" FOREIGN KEY ("rootId","entityId") REFERENCES "entity"("rootId","id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "order" ADD CONSTRAINT "order_workspaceId_workspace_id_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "order" ADD CONSTRAINT "order_planId_plan_id_fkey" FOREIGN KEY ("planId") REFERENCES "plan"("id");--> statement-breakpoint
ALTER TABLE "page" ADD CONSTRAINT "page_rootId_id_entity_rootId_id_fkey" FOREIGN KEY ("rootId","id") REFERENCES "entity"("rootId","id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "pagePatch" ADD CONSTRAINT "pagePatch_rootId_entityId_entity_rootId_id_fkey" FOREIGN KEY ("rootId","entityId") REFERENCES "entity"("rootId","id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "planPrice" ADD CONSTRAINT "planPrice_planId_plan_id_fkey" FOREIGN KEY ("planId") REFERENCES "plan"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "provider" ADD CONSTRAINT "provider_rootId_id_entity_rootId_id_fkey" FOREIGN KEY ("rootId","id") REFERENCES "entity"("rootId","id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "search" ADD CONSTRAINT "search_rootId_id_entity_rootId_id_fkey" FOREIGN KEY ("rootId","id") REFERENCES "entity"("rootId","id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "searchRecord" ADD CONSTRAINT "searchRecord_rootId_entityId_entity_rootId_id_fkey" FOREIGN KEY ("rootId","entityId") REFERENCES "entity"("rootId","id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "shortcut" ADD CONSTRAINT "shortcut_dirId_entity_id_fkey" FOREIGN KEY ("dirId") REFERENCES "entity"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "shortcut" ADD CONSTRAINT "shortcut_rootId_dirId_entity_rootId_id_fkey" FOREIGN KEY ("rootId","dirId") REFERENCES "entity"("rootId","id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "toolCall" ADD CONSTRAINT "toolCall_rootId_messageId_message_rootId_id_fkey" FOREIGN KEY ("rootId","messageId") REFERENCES "message"("rootId","id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "translation" ADD CONSTRAINT "translation_rootId_id_entity_rootId_id_fkey" FOREIGN KEY ("rootId","id") REFERENCES "entity"("rootId","id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "translationRecord" ADD CONSTRAINT "translationRecord_rootId_entityId_entity_rootId_id_fkey" FOREIGN KEY ("rootId","entityId") REFERENCES "entity"("rootId","id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "usage" ADD CONSTRAINT "usage_workspaceId_workspace_id_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "usage" ADD CONSTRAINT "usage_userId_user_id_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "userData" ADD CONSTRAINT "userData_id_user_id_fkey" FOREIGN KEY ("id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "userData" ADD CONSTRAINT "userData_lastWorkspaceId_workspace_id_fkey" FOREIGN KEY ("lastWorkspaceId") REFERENCES "workspace"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "workspace" ADD CONSTRAINT "workspace_id_entity_id_fkey" FOREIGN KEY ("id") REFERENCES "entity"("id");--> statement-breakpoint
ALTER TABLE "workspace" ADD CONSTRAINT "workspace_ownerId_user_id_fkey" FOREIGN KEY ("ownerId") REFERENCES "user"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "workspace" ADD CONSTRAINT "workspace_planId_plan_id_fkey" FOREIGN KEY ("planId") REFERENCES "plan"("id");--> statement-breakpoint
ALTER TABLE "workspace" ADD CONSTRAINT "workspace_trashId_entity_id_fkey" FOREIGN KEY ("trashId") REFERENCES "entity"("id");--> statement-breakpoint
ALTER TABLE "workspace" ADD CONSTRAINT "workspace_defaultLeftDirId_entity_id_fkey" FOREIGN KEY ("defaultLeftDirId") REFERENCES "entity"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "workspaceInvitation" ADD CONSTRAINT "workspaceInvitation_workspaceId_workspace_id_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "workspaceInvitation" ADD CONSTRAINT "workspaceInvitation_inviterId_user_id_fkey" FOREIGN KEY ("inviterId") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "two_factor" ADD CONSTRAINT "two_factor_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;