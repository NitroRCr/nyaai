DELETE FROM "member"
WHERE "id" IN (
  SELECT "id"
  FROM (
    SELECT "id", row_number() OVER (
      PARTITION BY "workspaceId", "userId"
      ORDER BY ("role" = 'owner') DESC, "id"
    ) AS "rowNumber"
    FROM "member"
  ) AS "duplicates"
  WHERE "rowNumber" > 1
);--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_workspaceId_userId_unique" UNIQUE("workspaceId","userId");
