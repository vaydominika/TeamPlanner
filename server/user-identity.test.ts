import assert from "node:assert/strict"
import test from "node:test"
import { readFileSync } from "node:fs"
import { DatabaseSync } from "node:sqlite"
import { getEstimatedWorkloadHours, getWorkloadConflictTasks } from "../src/lib/workload.js"
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

test("a becsült órák csak az érintett tag befejezetlen, időablakba eső feladataiból adódnak össze", () => {
  const task = { id: 1, projectId: 1, name: "Feladat", assignee: "Anna", assigneeId: "first", deadline: "2026-11-03", estimatedHours: 2.5, status: "Teendő" as const }
  const entries = [task, { ...task, id: 2, projectId: null, name: null, estimatedHours: 4 },
    { ...task, id: 3, assigneeId: "second", estimatedHours: 100 },
    { ...task, id: 4, status: "Kész" as const, estimatedHours: 100 },
    { ...task, id: 5, deadline: "2026-10-01", estimatedHours: 100 }]
  assert.equal(getEstimatedWorkloadHours(getWorkloadConflictTasks(entries, "first", "2026-11-03")), 6.5)
  assert.equal(getEstimatedWorkloadHours(getWorkloadConflictTasks(entries, "first", "2026-11-03", 1)), 4)
})

test("a munkaóra-migráció a régi feladatokat egyórás alapértékkel megőrzi", () => {
  const database = new DatabaseSync(":memory:")
  try {
    database.exec("CREATE TABLE Task (id INTEGER PRIMARY KEY, name TEXT); INSERT INTO Task VALUES (1, 'Régi feladat')")
    database.exec(readFileSync("prisma/migrations/20261103120000_add_estimated_hours/migration.sql", "utf8"))
    assert.equal(database.prepare("SELECT estimatedHours FROM Task WHERE id = 1").get()?.estimatedHours, 1)
    assert.equal(database.prepare("SELECT name FROM Task WHERE id = 1").get()?.name, "Régi feladat")
  } finally { database.close() }
})

test("azonos nevű tagok jogosultsága és terhelése felhasználóazonosító alapján különül el", () => {
  const project = { id: 1, name: "Projekt", description: "", teamId: 1, managerId: "manager", memberIds: ["first", "second"] }
  const task = { id: 1, projectId: 1, name: "Feladat", description: "", assignee: "Anna", assigneeId: "first", deadline: "2026-10-13", estimatedHours: 1, status: "Teendő" as const }
  const entries = [task, { ...task, id: 2, assigneeId: "second" }]
  assert.equal(canUpdateAssignedTaskStatus({ id: "first", name: "Anna" }, project, task), true)
  assert.equal(canUpdateAssignedTaskStatus({ id: "second", name: "Anna" }, project, task), false)
  assert.deepEqual(getWorkloadConflictTasks(entries, "first", "2026-10-13").map((entry) => entry.id), [1])
  assert.deepEqual(getWorkloadConflictTasks(entries, "second", "2026-10-13").map((entry) => entry.id), [2])
})
