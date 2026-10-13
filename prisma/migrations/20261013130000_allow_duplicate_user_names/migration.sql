ALTER TABLE "Task" ADD COLUMN "assigneeId" TEXT REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Preserve existing assignments before allowing duplicate display names.
UPDATE "Task" SET "assigneeId" = (
  SELECT "id" FROM "User" WHERE "User"."name" = "Task"."assignee"
) WHERE (SELECT COUNT(*) FROM "User" WHERE "User"."name" = "Task"."assignee") = 1;

DROP INDEX IF EXISTS "User_name_key";
