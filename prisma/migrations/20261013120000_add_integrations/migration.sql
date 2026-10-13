CREATE TABLE "CalendarConnection" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "credentials" TEXT,
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "CalendarConnection_userId_key" ON "CalendarConnection"("userId");
CREATE TABLE "CalendarAuthorization" (
  "userId" TEXT NOT NULL PRIMARY KEY,
  "stateHash" TEXT NOT NULL,
  "sessionHash" TEXT NOT NULL,
  "verifier" TEXT NOT NULL,
  "expiresAt" DATETIME NOT NULL,
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "CalendarAuthorization_stateHash_key" ON "CalendarAuthorization"("stateHash");
CREATE TABLE "CalendarEvent" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "connectionId" TEXT NOT NULL,
  "taskId" INTEGER,
  "externalEventId" TEXT NOT NULL,
  "dirty" BOOLEAN NOT NULL DEFAULT true,
  "revision" INTEGER NOT NULL DEFAULT 0,
  "lastError" TEXT,
  FOREIGN KEY ("connectionId") REFERENCES "CalendarConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "CalendarEvent_connectionId_taskId_key" ON "CalendarEvent"("connectionId", "taskId");
CREATE INDEX "CalendarEvent_taskId_idx" ON "CalendarEvent"("taskId");
