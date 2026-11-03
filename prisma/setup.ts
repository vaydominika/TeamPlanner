import path from "node:path"
import { fileURLToPath } from "node:url"
import { DatabaseSync } from "node:sqlite"
import { readFileSync } from "node:fs"

const directory = path.dirname(fileURLToPath(import.meta.url))
const database = new DatabaseSync(path.join(directory, "dev.db"))

database.exec(`
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS "Team" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "leaderId" TEXT NOT NULL,
    CONSTRAINT "Team_leaderId_fkey"
      FOREIGN KEY ("leaderId") REFERENCES "User" ("id")
      ON DELETE RESTRICT ON UPDATE CASCADE
  );

  CREATE TABLE IF NOT EXISTS "TeamMember" (
    "teamId" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    PRIMARY KEY ("teamId", "userId"),
    CONSTRAINT "TeamMember_teamId_fkey"
      FOREIGN KEY ("teamId") REFERENCES "Team" ("id")
      ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TeamMember_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User" ("id")
      ON DELETE CASCADE ON UPDATE CASCADE
  );

  CREATE TABLE IF NOT EXISTS "Project" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "managerId" TEXT NOT NULL,
    "teamId" INTEGER,
    CONSTRAINT "Project_managerId_fkey"
      FOREIGN KEY ("managerId") REFERENCES "User" ("id")
      ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Project_teamId_fkey"
      FOREIGN KEY ("teamId") REFERENCES "Team" ("id")
      ON DELETE CASCADE ON UPDATE CASCADE
  );

  CREATE TABLE IF NOT EXISTS "Task" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "projectId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "assignee" TEXT NOT NULL,
    "deadline" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    CONSTRAINT "Task_projectId_fkey"
      FOREIGN KEY ("projectId") REFERENCES "Project" ("id")
      ON DELETE CASCADE ON UPDATE CASCADE
  );
`)

const userColumns = database.prepare('PRAGMA table_info("User")').all() as Array<{ name: string }>
if (!userColumns.some((column) => column.name === "email")) {
  database.exec('ALTER TABLE "User" ADD COLUMN "email" TEXT;')
}
if (!userColumns.some((column) => column.name === "passwordHash")) {
  database.exec('ALTER TABLE "User" ADD COLUMN "passwordHash" TEXT;')
}

const projectColumns = database.prepare('PRAGMA table_info("Project")').all() as Array<{ name: string }>
if (!projectColumns.some((column) => column.name === "teamId")) {
  database.exec('ALTER TABLE "Project" ADD COLUMN "teamId" INTEGER;')
}

database.exec(`
  CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");

  CREATE TABLE IF NOT EXISTS "Session" (
    "tokenHash" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Session_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User" ("id")
      ON DELETE CASCADE ON UPDATE CASCADE
  );

  CREATE INDEX IF NOT EXISTS "Session_userId_idx" ON "Session"("userId");
`)

// The local setup remains idempotent and applies the same integration DDL as Prisma.
database.exec(readFileSync(path.join(directory, "migrations/20261013120000_add_integrations/migration.sql"), "utf8")
  .replaceAll('CREATE TABLE "', 'CREATE TABLE IF NOT EXISTS "')
  .replaceAll('CREATE UNIQUE INDEX "', 'CREATE UNIQUE INDEX IF NOT EXISTS "')
  .replaceAll('CREATE INDEX "', 'CREATE INDEX IF NOT EXISTS "'))
const taskColumns = database.prepare('PRAGMA table_info("Task")').all() as Array<{ name: string }>
if (!taskColumns.some((column) => column.name === "assigneeId")) {
  database.exec("BEGIN")
  try {
    database.exec(readFileSync(path.join(directory, "migrations/20261013130000_allow_duplicate_user_names/migration.sql"), "utf8"))
    database.exec("COMMIT")
  } catch (error) {
    database.exec("ROLLBACK")
    throw error
  }
} else {
  database.exec('DROP INDEX IF EXISTS "User_name_key"')
}
if (!taskColumns.some((column) => column.name === "estimatedHours")) {
  database.exec(readFileSync(path.join(directory, "migrations/20261103120000_add_estimated_hours/migration.sql"), "utf8"))
}
database.close()
