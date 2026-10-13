import assert from "node:assert/strict"
import { after, before, test } from "node:test"
import { randomBytes } from "node:crypto"
import { mkdtempSync, readFileSync, rmSync } from "node:fs"
import path from "node:path"
import { once } from "node:events"
import { DatabaseSync } from "node:sqlite"
import { PrismaClient } from "../prisma/generated/client/index.js"
import { CalendarService } from "./calendar.js"
import { CalendarEventGoneError, calendarEvent, GoogleCalendarProvider, type CalendarCredentials, type CalendarProvider } from "./calendar-provider.js"
import { decryptSecret, encryptSecret, IntegrationError } from "./integration-security.js"
import { OpenAISummaryProvider, summaryInput } from "./summary.js"
import { hashSessionToken } from "./auth.js"

const context = { name: "Meghívó", description: "A helyszín adataival.", deadline: "2026-10-31", status: "Teendő", assignee: "Nóra", project: { name: "Találkozó" } }
const credentials: CalendarCredentials = { accessToken: "private-access", refreshToken: "private-refresh", expiresAt: Date.now() + 3600000 }
const directory = mkdtempSync(path.join(process.cwd(), ".integration-test-"))
const databasePath = path.join(directory, "test.db")
const prisma = new PrismaClient({ datasourceUrl: `file:${databasePath.replaceAll("\\", "/")}` })
const savedEnvironment = { ...process.env }
const originalFetch = globalThis.fetch

before(async () => {
  process.env.INTEGRATION_ENCRYPTION_KEY = randomBytes(32).toString("hex")
  process.env.GOOGLE_CLIENT_ID = "test-client"
  process.env.GOOGLE_CLIENT_SECRET = "private-secret"
  process.env.GOOGLE_REDIRECT_URI = "http://localhost:5173/api/integrations/calendar/callback"
  process.env.APP_URL = "http://localhost:5173"
  const database = new DatabaseSync(databasePath)
  database.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE User (id TEXT PRIMARY KEY, name TEXT, email TEXT, passwordHash TEXT, role TEXT);
    CREATE TABLE Project (id INTEGER PRIMARY KEY, name TEXT, description TEXT, managerId TEXT, teamId INTEGER);
    CREATE TABLE Task (id INTEGER PRIMARY KEY, projectId INTEGER, name TEXT, description TEXT, assignee TEXT, deadline TEXT, status TEXT, FOREIGN KEY(projectId) REFERENCES Project(id) ON DELETE CASCADE);
    CREATE TABLE TeamMember (teamId INTEGER, userId TEXT, PRIMARY KEY(teamId, userId));
    CREATE TABLE Team (id INTEGER PRIMARY KEY, name TEXT, description TEXT, leaderId TEXT);
    CREATE TABLE Session (tokenHash TEXT PRIMARY KEY, userId TEXT, expiresAt DATETIME, createdAt DATETIME DEFAULT CURRENT_TIMESTAMP);
  `)
  database.exec(readFileSync("prisma/migrations/20261013120000_add_integrations/migration.sql", "utf8"))
  database.exec(readFileSync("prisma/migrations/20261013130000_allow_duplicate_user_names/migration.sql", "utf8"))
  database.exec('CREATE UNIQUE INDEX User_email_key ON User(email)')
  database.close()
  await prisma.user.create({ data: { id: "owner", name: "Eszter", email: "test@example.com", passwordHash: "hash", role: "team-member" } })
  await prisma.team.create({ data: { id: 1, name: "Csapat", description: "", leaderId: "owner" } })
  await prisma.teamMember.create({ data: { teamId: 1, userId: "owner" } })
  await prisma.project.create({ data: { id: 1, name: "Találkozó", description: "", managerId: "owner", teamId: 1 } })
})

after(async () => {
  globalThis.fetch = originalFetch
  process.env = savedEnvironment
  await prisma.$disconnect()
  rmSync(directory, { recursive: true, force: true })
})

class FakeCalendarProvider implements CalendarProvider {
  name = "google"
  saved: Array<{ id: string; name: string }> = []
  deleted: string[] = []
  fail = false
  gone = false
  onSave?: () => Promise<void>
  authorizationUrl(state: string) { return `https://accounts.google.com/?state=${state}` }
  async exchange() { return credentials }
  async refresh() { return credentials }
  async saveEvent(_credentials: CalendarCredentials, id: string, task: typeof context) {
    if (this.fail) throw new IntegrationError("Teszt szinkronizálási hiba.")
    if (this.gone) { this.gone = false; throw new CalendarEventGoneError("Törölt esemény.") }
    await this.onSave?.()
    this.saved.push({ id, name: task.name })
  }
  async deleteEvent(_credentials: CalendarCredentials, id: string) { this.deleted.push(id) }
  async revoke() {}
}

test("a titkok hitelesítetten titkosítottak, manipulálásuk nem olvasható", () => {
  const encrypted = encryptSecret("private-refresh")
  assert.ok(!encrypted.includes("private-refresh"))
  assert.equal(decryptSecret(encrypted), "private-refresh")
  assert.throws(() => decryptSecret(`${encrypted}broken`), IntegrationError)
})

test("az OAuth állapot egyszer használatos és a bejelentkezett munkamenethez kötött", async () => {
  const provider = new FakeCalendarProvider()
  const calendar = new CalendarService(prisma, provider)
  const url = new URL(await calendar.connect("owner", "session-one"))
  const state = url.searchParams.get("state")!
  await assert.rejects(calendar.complete("owner", "session-two", state, "code"), IntegrationError)
  await assert.rejects(calendar.complete("owner", "session-one", "invalid", "code"), IntegrationError)
  await calendar.complete("owner", "session-one", state, "code")
  await assert.rejects(calendar.complete("owner", "session-one", state, "code"), IntegrationError)
  const status = await calendar.status("owner")
  assert.equal(status.connected, true)
  assert.ok(!JSON.stringify(status).includes("private"))
})

test("szinkronizálás, módosítás, hiba és újrapróbálás ugyanazt az eseményt használja; törlés tartós", async () => {
  const provider = new FakeCalendarProvider()
  const calendar = new CalendarService(prisma, provider)
  const task = await prisma.task.create({ data: { ...context, project: undefined, projectId: 1 } })
  await calendar.sync("owner", task.id)
  await calendar.sync("owner", task.id)
  assert.equal(await prisma.calendarEvent.count(), 1)
  assert.equal(provider.saved[0].id, provider.saved[1].id)
  await prisma.task.update({ where: { id: task.id }, data: { name: "Frissített meghívó", calendarEvents: { updateMany: { where: {}, data: { dirty: true, revision: { increment: 1 } } } } } })
  provider.fail = true
  await calendar.reconcile()
  assert.equal((await calendar.status("owner")).pendingCount, 1)
  assert.equal((await prisma.task.findUniqueOrThrow({ where: { id: task.id } })).name, "Frissített meghívó")
  provider.fail = false
  await calendar.reconcile()
  assert.equal(provider.saved.at(-1)?.name, "Frissített meghívó")
  assert.equal((await calendar.status("owner")).pendingCount, 0)
  await prisma.task.delete({ where: { id: task.id } })
  assert.equal((await prisma.calendarEvent.findFirstOrThrow()).taskId, null)
  await calendar.reconcile()
  assert.deepEqual(provider.deleted, [provider.saved[0].id])
  assert.equal(await prisma.calendarEvent.count(), 0)
})

test("megszűnt projektjogosultságnál nem küld feladatadatot a naptárnak", async () => {
  const provider = new FakeCalendarProvider()
  const calendar = new CalendarService(prisma, provider)
  const task = await prisma.task.create({ data: { ...context, project: undefined, projectId: 1 } })
  await calendar.sync("owner", task.id)
  await prisma.project.update({ where: { id: 1 }, data: { managerId: "another-user", teamId: null } })
  await prisma.calendarEvent.updateMany({ data: { dirty: true } })
  await calendar.reconcile()
  assert.equal(provider.saved.length, 1)
  assert.equal(provider.deleted.length, 1)
  await prisma.project.update({ where: { id: 1 }, data: { managerId: "owner", teamId: 1 } })
})

test("közben módosított feladat frissítési jelzése és törölt Google-esemény új azonosítója megmarad", async () => {
  const provider = new FakeCalendarProvider()
  const calendar = new CalendarService(prisma, provider)
  const task = await prisma.task.create({ data: { ...context, project: undefined, projectId: 1 } })
  provider.onSave = async () => {
    provider.onSave = undefined
    await prisma.task.update({ where: { id: task.id }, data: { name: "Újabb változat", calendarEvents: { updateMany: { where: {}, data: { dirty: true, revision: { increment: 1 } } } } } })
  }
  await calendar.sync("owner", task.id)
  assert.equal((await prisma.calendarEvent.findFirstOrThrow({ where: { taskId: task.id } })).dirty, true)
  const oldId = provider.saved.at(-1)!.id
  provider.gone = true
  await calendar.reconcile()
  const event = await prisma.calendarEvent.findFirstOrThrow({ where: { taskId: task.id } })
  assert.equal(event.dirty, false)
  assert.notEqual(event.externalEventId, oldId)
  assert.equal(provider.saved.at(-1)!.id, event.externalEventId)
})

test("naptáresemény egész napos és az utolsó napot kizáró záródátummal készül", () => {
  const event = calendarEvent(context)
  assert.equal(event.start.date, "2026-10-31")
  assert.equal(event.end.date, "2026-11-01")
  assert.ok(event.description.includes("Találkozó"))
  assert.throws(() => calendarEvent({ ...context, deadline: "2026-02-31" }), IntegrationError)
})

test("lekapcsolás törli a tokeneket, újracsatlakozás megőrzi az eseményazonosítót", async () => {
  const provider = new FakeCalendarProvider()
  const calendar = new CalendarService(prisma, provider)
  const task = await prisma.task.create({ data: { ...context, project: undefined, projectId: 1 } })
  await calendar.sync("owner", task.id)
  const eventId = provider.saved.at(-1)!.id
  await calendar.disconnect("owner")
  assert.equal((await prisma.calendarConnection.findUniqueOrThrow({ where: { userId: "owner" } })).credentials, null)
  assert.equal((await calendar.status("owner")).connected, false)
  await assert.rejects(calendar.sync("owner", task.id), IntegrationError)
  await calendar.reconcile()
  const savedCount = provider.saved.length
  assert.equal(savedCount, 1)
  const state = new URL(await calendar.connect("owner", "new-session")).searchParams.get("state")!
  await calendar.complete("owner", "new-session", state, "code")
  await calendar.reconcile()
  assert.ok(provider.saved.slice(savedCount).some((item) => item.id === eventId))
})

test("Google ütköző beszúrásnál a meglévő eseményt frissíti", async () => {
  const methods: string[] = []
  const statuses = [404, 409, 200]
  globalThis.fetch = async (_url, init) => {
    methods.push(init?.method ?? "GET")
    return new Response("{}", { status: statuses.shift()! })
  }
  try {
    await new GoogleCalendarProvider().saveEvent(credentials, "abc123", context)
    assert.deepEqual(methods, ["PUT", "POST", "PUT"])
  } finally { globalThis.fetch = originalFetch }
})

test("összefoglalás csak minimális adatot küld, a válasz és hibák ellenőrzöttek", async () => {
  const provider = new OpenAISummaryProvider()
  delete process.env.OPENAI_API_KEY
  await assert.rejects(provider.summarize(context), IntegrationError)
  process.env.OPENAI_API_KEY = "private-key"
  process.env.OPENAI_MODEL = "configured-model"
  assert.deepEqual(Object.keys(JSON.parse(summaryInput({ ...context, project: { ...context.project, secret: "unrelated" } } as typeof context))), ["title", "description", "deadline", "status", "assignee", "project"])
  globalThis.fetch = async (_url, init) => {
    const body = JSON.parse(String(init?.body))
    assert.equal(body.store, false)
    assert.ok(!body.input.includes("unrelated"))
    return Response.json({ status: "completed", output: [{ type: "message", content: [{ type: "output_text", text: "Készítsd el a meghívót október 31-ig." }] }] })
  }
  try {
    assert.equal(await provider.summarize(context), "Készítsd el a meghívót október 31-ig.")
    globalThis.fetch = async () => Response.json({ status: "completed", output: [] })
    await assert.rejects(provider.summarize(context), IntegrationError)
    globalThis.fetch = async () => Response.json({ status: "completed", output: [{ type: "message", content: [{ type: "output_text", text: "x".repeat(601) }] }] })
    await assert.rejects(provider.summarize(context), IntegrationError)
    globalThis.fetch = async () => new Response("failure", { status: 503 })
    await assert.rejects(provider.summarize(context), IntegrationError)
    globalThis.fetch = async () => { throw new DOMException("Timeout", "TimeoutError") }
    await assert.rejects(provider.summarize(context), IntegrationError)
  } finally { globalThis.fetch = originalFetch }
})

test("HTTP végpontok bejelentkezést és projektjogosultságot ellenőriznek", async () => {
  process.env.DATABASE_URL = `file:${databasePath.replaceAll("\\", "/")}`
  process.env.OPENAI_API_KEY = ""
  process.env.LLM_PROVIDER = "openai"
  const { app, prisma: appPrisma } = await import("./index.js")
  const server = app.listen(0, "127.0.0.1")
  await once(server, "listening")
  const address = server.address()
  assert.ok(address && typeof address !== "string")
  const base = `http://127.0.0.1:${address.port}`
  await prisma.user.create({ data: { id: "outsider", name: "Külső tag", email: "outsider@example.com", passwordHash: "hash", role: "team-member" } })
  await prisma.session.createMany({ data: ["owner", "outsider"].map((userId) => ({ tokenHash: hashSessionToken(`${userId}-session`), userId, expiresAt: new Date(Date.now() + 60000) })) })
  const task = await prisma.task.findFirstOrThrow({ where: { projectId: 1 } })
  const headers = { "Content-Type": "application/json" }
  try {
    for (const suffix of ["summary", "calendar"]) {
      const route = `${base}/api/tasks/${task.id}/${suffix}`
      assert.equal((await fetch(route, { method: "POST", headers })).status, 401)
      assert.equal((await fetch(route, { method: "POST", headers: { ...headers, Cookie: "tp_session=outsider-session" } })).status, 403)
      assert.equal((await fetch(route, { method: "POST", headers: { ...headers, Cookie: "tp_session=owner-session", Origin: "https://untrusted.example" } })).status, 403)
    }
    const ownerHeaders = { ...headers, Cookie: "tp_session=owner-session" }
    assert.equal((await fetch(`${base}/api/tasks/invalid/summary`, { method: "POST", headers: ownerHeaders })).status, 400)
    assert.equal((await fetch(`${base}/api/tasks/999999/summary`, { method: "POST", headers: ownerHeaders })).status, 404)
    const missingConfig = await fetch(`${base}/api/tasks/${task.id}/summary`, { method: "POST", headers: ownerHeaders })
    assert.equal(missingConfig.status, 503)
    assert.ok((await missingConfig.json() as { message: string }).message.includes("nincs beállítva"))
    const update = await fetch(`${base}/api/tasks/${task.id}`, { method: "PATCH", headers: ownerHeaders, body: JSON.stringify({ ...context, name: "Mentés szolgáltatás nélkül", assigneeId: "owner" }) })
    assert.equal(update.status, 200)
    assert.equal((await update.json() as { name: string }).name, "Mentés szolgáltatás nélkül")
    assert.equal((await fetch(`${base}/api/integrations/calendar`)).status, 401)
    const status = await (await fetch(`${base}/api/integrations/calendar`, { headers: ownerHeaders })).json()
    assert.ok(!JSON.stringify(status).includes("private"))

    const register = (email: string) => fetch(`${base}/api/auth/register`, { method: "POST", headers, body: JSON.stringify({ name: "Eszter", email, password: "test-password-123" }) })
    const first = await register("same-name-one@example.com")
    const second = await register("same-name-two@example.com")
    assert.equal(first.status, 201)
    assert.equal(second.status, 201)
    assert.equal((await register("same-name-one@example.com")).status, 409)
    const twin = (await first.json() as { user: { id: string } }).user
    const otherTwin = (await second.json() as { user: { id: string } }).user
    await prisma.teamMember.createMany({ data: [twin.id, otherTwin.id].map((userId) => ({ teamId: 1, userId })) })
    await prisma.session.create({ data: { tokenHash: hashSessionToken("twin-session"), userId: twin.id, expiresAt: new Date(Date.now() + 60000) } })
    await prisma.session.create({ data: { tokenHash: hashSessionToken("other-twin-session"), userId: otherTwin.id, expiresAt: new Date(Date.now() + 60000) } })
    const twinHeaders = { ...headers, Cookie: "tp_session=twin-session" }
    const otherTwinHeaders = { ...headers, Cookie: "tp_session=other-twin-session" }
    assert.equal((await fetch(`${base}/api/tasks/${task.id}`, { method: "PATCH", headers: twinHeaders, body: JSON.stringify({ status: "Kész" }) })).status, 403)
    const reassign = await fetch(`${base}/api/tasks/${task.id}`, { method: "PATCH", headers: ownerHeaders, body: JSON.stringify({ ...context, assigneeId: twin.id }) })
    assert.equal(reassign.status, 200)
    const assignedTask = await reassign.json() as { assigneeId: string; assignee: string }
    assert.equal(assignedTask.assigneeId, twin.id)
    assert.equal(assignedTask.assignee, "Eszter")
    assert.equal((await fetch(`${base}/api/tasks/${task.id}`, { method: "PATCH", headers: twinHeaders, body: JSON.stringify({ status: "Kész" }) })).status, 200)
    assert.equal((await fetch(`${base}/api/tasks/${task.id}`, { method: "PATCH", headers: otherTwinHeaders, body: JSON.stringify({ status: "Teendő" }) })).status, 403)
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
    await appPrisma.$disconnect()
  }
})
