import assert from "node:assert/strict"
import test from "node:test"
import { readFileSync } from "node:fs"
import { DatabaseSync } from "node:sqlite"
import { getWorkloadConflictTasks } from "../src/lib/workload.js"
import { canUpdateAssignedTaskStatus } from "../src/lib/permissions.js"

test("a névmigráció megőrzi a régi felelőst, a nevek többé nem egyediek", () => {
  const database = new DatabaseSync(":memory:")
  try {
    database.exec(`
      CREATE TABLE User (id TEXT PRIMARY KEY, name TEXT);
      CREATE UNIQUE INDEX User_name_key ON User(name);
      CREATE TABLE Task (id INTEGER PRIMARY KEY, assignee TEXT);
      INSERT INTO User VALUES ('original', 'Anna');
      INSERT INTO Task VALUES (1, 'Anna'), (2, 'Ismeretlen');
    `)
    database.exec(readFileSync("prisma/migrations/20261013130000_allow_duplicate_user_names/migration.sql", "utf8"))
    database.exec("INSERT INTO User VALUES ('second', 'Anna')")
    assert.equal(database.prepare("SELECT assigneeId FROM Task WHERE id = 1").get()?.assigneeId, "original")
    assert.equal(database.prepare("SELECT assigneeId FROM Task WHERE id = 2").get()?.assigneeId, null)
    assert.equal(database.prepare("SELECT COUNT(*) AS count FROM User WHERE name = 'Anna'").get()?.count, 2)
  } finally { database.close() }
})

test("azonos nevű tagok jogosultsága és terhelése felhasználóazonosító alapján különül el", () => {
  const project = { id: 1, name: "Projekt", description: "", teamId: 1, managerId: "manager", memberIds: ["first", "second"] }
  const task = { id: 1, projectId: 1, name: "Feladat", description: "", assignee: "Anna", assigneeId: "first", deadline: "2026-10-13", status: "Teendő" as const }
  const entries = [task, { ...task, id: 2, assigneeId: "second" }]
  assert.equal(canUpdateAssignedTaskStatus({ id: "first", name: "Anna" }, project, task), true)
  assert.equal(canUpdateAssignedTaskStatus({ id: "second", name: "Anna" }, project, task), false)
  assert.deepEqual(getWorkloadConflictTasks(entries, "first", "2026-10-13").map((entry) => entry.id), [1])
  assert.deepEqual(getWorkloadConflictTasks(entries, "second", "2026-10-13").map((entry) => entry.id), [2])
})
