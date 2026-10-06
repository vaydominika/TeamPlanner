import path from "node:path"
import { randomUUID } from "node:crypto"
import { fileURLToPath } from "node:url"
import cors from "cors"
import express, { type Request, type Response } from "express"
import { PrismaClient, type Project, type User } from "../prisma/generated/client/index.js"
import { createSessionToken, hashPassword, hashSessionToken, verifyPassword } from "./auth.js"

const prisma = new PrismaClient()
const app = express()
const port = Number(process.env.PORT ?? 3001)
const validStatuses = new Set(["Teendő", "Folyamatban", "Kész"])
const sessionCookieName = "tp_session"
const sessionDurationMs = 7 * 24 * 60 * 60 * 1000

app.disable("x-powered-by")
app.use(cors({ origin: ["http://127.0.0.1:5173", "http://localhost:5173"], credentials: true }))
app.use(express.json())

function sendError(response: Response, status: number, message: string) {
  return response.status(status).json({ message })
}

function readText(value: unknown, maxLength = 240) {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed.length > 0 && trimmed.length <= maxLength ? trimmed : null
}

function readDeadline(value: unknown) {
  const deadline = readText(value, 10)
  if (!deadline || !/^\d{4}-\d{2}-\d{2}$/.test(deadline)) return null

  const parsed = new Date(`${deadline}T00:00:00Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(deadline) ? deadline : null
}

function readProjectId(value: string) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

function readCookie(request: Request, name: string) {
  const cookies = request.header("cookie")?.split(";") ?? []
  for (const cookie of cookies) {
    const [cookieName, ...valueParts] = cookie.trim().split("=")
    if (cookieName === name) return decodeURIComponent(valueParts.join("="))
  }
  return null
}

function setSessionCookie(response: Response, token: string) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : ""
  response.setHeader(
    "Set-Cookie",
    `${sessionCookieName}=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${Math.floor(sessionDurationMs / 1000)}${secure}`,
  )
}

function clearSessionCookie(response: Response) {
  response.setHeader(
    "Set-Cookie",
    `${sessionCookieName}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`,
  )
}

function toPublicUser(user: User) {
  return { id: user.id, name: user.name }
}

async function createSession(userId: string, response: Response) {
  const token = createSessionToken()
  await prisma.session.create({
    data: {
      tokenHash: hashSessionToken(token),
      userId,
      expiresAt: new Date(Date.now() + sessionDurationMs),
    },
  })
  setSessionCookie(response, token)
}

async function getCurrentUser(request: Request, response: Response) {
  const token = readCookie(request, sessionCookieName)
  if (!token) {
    sendError(response, 401, "A folytatáshoz jelentkezz be.")
    return null
  }

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashSessionToken(token) },
    include: { user: true },
  })
  if (!session || session.expiresAt <= new Date()) {
    if (session) await prisma.session.delete({ where: { tokenHash: session.tokenHash } })
    clearSessionCookie(response)
    sendError(response, 401, "A munkamenet lejárt. Jelentkezz be újra.")
    return null
  }

  return session.user
}

function isProjectManager(user: User, project: Project) {
  return project.managerId === user.id
}

async function canViewProject(user: User, project: Project) {
  if (project.managerId === user.id) return true
  if (!project.teamId) return false
  const membership = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId: project.teamId, userId: user.id } },
  })
  return membership !== null
}

async function loadTeam(teamId: number, response: Response) {
  const team = await prisma.team.findUnique({ where: { id: teamId } })
  if (!team) sendError(response, 404, "A csapat nem található.")
  return team
}

async function loadProject(projectId: number, response: Response) {
  const project = await prisma.project.findUnique({ where: { id: projectId } })
  if (!project) sendError(response, 404, "A projekt nem található.")
  return project
}

async function loadTask(taskId: number, response: Response) {
  const task = await prisma.task.findUnique({ where: { id: taskId }, include: { project: true } })
  if (!task) sendError(response, 404, "A feladat nem található.")
  return task
}

async function validateAssignee(projectId: number, assignee: string) {
  const user = await prisma.user.findUnique({ where: { name: assignee } })
  if (!user) return false
  const project = await prisma.project.findUnique({ where: { id: projectId } })
  if (!project?.teamId) return false
  const membership = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId: project.teamId, userId: user.id } },
  })
  return membership !== null
}

app.get("/api/health", (_request, response) => {
  response.json({ status: "ok" })
})

app.post("/api/auth/register", async (request, response) => {
  const name = readText(request.body?.name, 100)
  const email = readText(request.body?.email, 200)?.toLowerCase()
  const password = typeof request.body?.password === "string" ? request.body.password : ""

  if (!name || !email || !/^\S+@\S+\.\S+$/.test(email)) {
    return sendError(response, 400, "Adj meg egy nevet és egy érvényes e-mail-címet.")
  }
  if (password.length < 8 || password.length > 128) {
    return sendError(response, 400, "A jelszó legalább 8, legfeljebb 128 karakter legyen.")
  }

  const existingUser = await prisma.user.findFirst({
    where: { OR: [{ email }, { name }] },
  })
  if (existingUser) return sendError(response, 409, "Ez a név vagy e-mail-cím már használatban van.")

  const user = await prisma.user.create({
    data: {
      id: randomUUID(),
      name,
      email,
      passwordHash: await hashPassword(password),
      role: "team-member",
    },
  })
  await createSession(user.id, response)
  response.status(201).json({ user: toPublicUser(user) })
})

app.post("/api/auth/login", async (request, response) => {
  const email = readText(request.body?.email, 200)?.toLowerCase()
  const password = typeof request.body?.password === "string" ? request.body.password : ""
  const user = email ? await prisma.user.findUnique({ where: { email } }) : null

  if (!user || !await verifyPassword(password, user.passwordHash)) {
    return sendError(response, 401, "Az e-mail-cím vagy a jelszó nem megfelelő.")
  }

  await createSession(user.id, response)
  response.json({ user: toPublicUser(user) })
})

app.post("/api/auth/logout", async (request, response) => {
  const token = readCookie(request, sessionCookieName)
  if (token) {
    await prisma.session.deleteMany({ where: { tokenHash: hashSessionToken(token) } })
  }
  clearSessionCookie(response)
  response.status(204).send()
})

app.get("/api/session", async (request, response) => {
  const currentUser = await getCurrentUser(request, response)
  if (!currentUser) return

  const teams = await prisma.team.findMany({
    where: {
      OR: [
        { leaderId: currentUser.id },
        { members: { some: { userId: currentUser.id } } },
      ],
    },
    include: { members: true },
    orderBy: { id: "asc" },
  })
  const visibleTeamIds = teams.map((team) => team.id)
  const projects = await prisma.project.findMany({
    where: { teamId: { in: visibleTeamIds } },
    orderBy: { id: "asc" },
  })
  const visibleProjectIds = projects.map((project) => project.id)
  const [tasks, allTasks, users] = await Promise.all([
    prisma.task.findMany({
      where: { projectId: { in: visibleProjectIds } },
      orderBy: [{ deadline: "asc" }, { id: "asc" }],
    }),
    prisma.task.findMany({ orderBy: { id: "asc" } }),
    prisma.user.findMany({ orderBy: { name: "asc" } }),
  ])
  const visibleProjectIdSet = new Set(visibleProjectIds)

  response.json({
    currentUser: toPublicUser(currentUser),
    users: users.map(toPublicUser),
    teams: teams.map((team) => ({
      id: team.id,
      name: team.name,
      description: team.description,
      leaderId: team.leaderId,
      memberIds: team.members.map((member) => member.userId),
    })),
    projects: projects.map((project) => ({
      id: project.id,
      name: project.name,
      description: project.description,
      managerId: project.managerId,
      teamId: project.teamId,
      memberIds: teams.find((team) => team.id === project.teamId)?.members.map((member) => member.userId) ?? [],
    })),
    tasks,
    workloadEntries: allTasks.map((task) => {
      const isVisible = visibleProjectIdSet.has(task.projectId)
      return {
        id: task.id,
        assignee: task.assignee,
        deadline: task.deadline,
        status: task.status,
        projectId: isVisible ? task.projectId : null,
        name: isVisible ? task.name : null,
      }
    }),
  })
})

app.post("/api/teams", async (request, response) => {
  const currentUser = await getCurrentUser(request, response)
  if (!currentUser) return

  const name = readText(request.body?.name, 100)
  const description = readText(request.body?.description, 500)
  if (!name || !description) return sendError(response, 400, "A csapat neve és leírása kötelező.")

  const team = await prisma.team.create({
    data: {
      name,
      description,
      leaderId: currentUser.id,
      members: { create: { userId: currentUser.id } },
    },
  })
  response.status(201).json({ ...team, memberIds: [currentUser.id] })
})

app.patch("/api/teams/:teamId/members", async (request, response) => {
  const currentUser = await getCurrentUser(request, response)
  const teamId = readProjectId(request.params.teamId)
  if (!currentUser || !teamId) return
  const team = await loadTeam(teamId, response)
  if (!team) return
  if (team.leaderId !== currentUser.id) {
    return sendError(response, 403, "Csak a csapat vezetője kezelheti a tagokat.")
  }

  if (!Array.isArray(request.body?.memberIds) || !request.body.memberIds.every((id: unknown) => typeof id === "string")) {
    return sendError(response, 400, "A csapattagok listája érvénytelen.")
  }
  const requestedIds = Array.from(new Set<string>([...request.body.memberIds, team.leaderId]))
  const existingUsers = await prisma.user.count({ where: { id: { in: requestedIds } } })
  if (existingUsers !== requestedIds.length) return sendError(response, 400, "Ismeretlen csapattag szerepel a listában.")

  await prisma.$transaction([
    prisma.teamMember.deleteMany({ where: { teamId } }),
    prisma.teamMember.createMany({ data: requestedIds.map((userId) => ({ teamId, userId })) }),
  ])
  response.json({ memberIds: requestedIds })
})

app.post("/api/projects", async (request, response) => {
  const currentUser = await getCurrentUser(request, response)
  if (!currentUser) return

  const teamId = readProjectId(String(request.body?.teamId ?? ""))
  if (!teamId) return sendError(response, 400, "A projekthez csapatot kell választani.")
  const team = await loadTeam(teamId, response)
  if (!team) return
  if (team.leaderId !== currentUser.id) return sendError(response, 403, "Csak a csapat vezetője hozhat létre projektet.")

  const name = readText(request.body?.name, 100)
  const description = readText(request.body?.description, 500)
  if (!name || !description) return sendError(response, 400, "A projekt neve és leírása kötelező.")

  const project = await prisma.project.create({
    data: {
      name,
      description,
      managerId: currentUser.id,
      teamId,
    },
  })
  response.status(201).json(project)
})

app.patch("/api/projects/:projectId", async (request, response) => {
  const currentUser = await getCurrentUser(request, response)
  const projectId = readProjectId(request.params.projectId)
  if (!currentUser || !projectId) return
  const project = await loadProject(projectId, response)
  if (!project) return
  if (!isProjectManager(currentUser, project)) {
    return sendError(response, 403, "Ezt a projektet másik csapat vezetője kezeli.")
  }

  const name = readText(request.body?.name, 100)
  const description = readText(request.body?.description, 500)
  if (!name || !description) return sendError(response, 400, "A projekt neve és leírása kötelező.")

  const updatedProject = await prisma.project.update({
    where: { id: projectId },
    data: { name, description },
  })
  response.json(updatedProject)
})

app.delete("/api/projects/:projectId", async (request, response) => {
  const currentUser = await getCurrentUser(request, response)
  const projectId = readProjectId(request.params.projectId)
  if (!currentUser || !projectId) return
  const project = await loadProject(projectId, response)
  if (!project) return
  if (!isProjectManager(currentUser, project)) {
    return sendError(response, 403, "Ezt a projektet másik csapat vezetője kezeli.")
  }

  await prisma.project.delete({ where: { id: projectId } })
  response.status(204).send()
})

app.post("/api/projects/:projectId/tasks", async (request, response) => {
  const currentUser = await getCurrentUser(request, response)
  const projectId = readProjectId(request.params.projectId)
  if (!currentUser || !projectId) return
  const project = await loadProject(projectId, response)
  if (!project) return
  if (!isProjectManager(currentUser, project)) {
    return sendError(response, 403, "Ebben a projektben nem hozhatsz létre feladatot.")
  }

  const name = readText(request.body?.name, 120)
  const description = readText(request.body?.description, 500)
  const assignee = readText(request.body?.assignee, 100)
  const deadline = readDeadline(request.body?.deadline)
  const status = readText(request.body?.status, 30)
  if (!name || !description || !assignee || !deadline || !status || !validStatuses.has(status)) {
    return sendError(response, 400, "A feladat adatai hiányosak vagy érvénytelenek.")
  }
  if (!await validateAssignee(projectId, assignee)) {
    return sendError(response, 400, "A felelős nem tagja ennek a csapatnak.")
  }

  const task = await prisma.task.create({
    data: { projectId, name, description, assignee, deadline, status },
  })
  response.status(201).json(task)
})

app.patch("/api/tasks/:taskId", async (request, response) => {
  const currentUser = await getCurrentUser(request, response)
  const taskId = readProjectId(request.params.taskId)
  if (!currentUser || !taskId) return
  const task = await loadTask(taskId, response)
  if (!task) return

  if (isProjectManager(currentUser, task.project)) {
    const name = readText(request.body?.name, 120)
    const description = readText(request.body?.description, 500)
    const assignee = readText(request.body?.assignee, 100)
    const deadline = readDeadline(request.body?.deadline)
    const status = readText(request.body?.status, 30)
    if (!name || !description || !assignee || !deadline || !status || !validStatuses.has(status)) {
      return sendError(response, 400, "A feladat adatai hiányosak vagy érvénytelenek.")
    }
    if (!await validateAssignee(task.projectId, assignee)) {
      return sendError(response, 400, "A felelős nem tagja ennek a csapatnak.")
    }

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: { name, description, assignee, deadline, status },
    })
    return response.json(updatedTask)
  }

  const projectIsVisible = await canViewProject(currentUser, task.project)
  const status = readText(request.body?.status, 30)
  if (
    !projectIsVisible
    || task.assignee !== currentUser.name
    || !status
    || !validStatuses.has(status)
  ) {
    return sendError(response, 403, "Csak a saját feladatod állapotát módosíthatod.")
  }

  const updatedTask = await prisma.task.update({ where: { id: taskId }, data: { status } })
  response.json(updatedTask)
})

app.delete("/api/tasks/:taskId", async (request, response) => {
  const currentUser = await getCurrentUser(request, response)
  const taskId = readProjectId(request.params.taskId)
  if (!currentUser || !taskId) return
  const task = await loadTask(taskId, response)
  if (!task) return
  if (!isProjectManager(currentUser, task.project)) {
    return sendError(response, 403, "Ezt a feladatot nem törölheted.")
  }

  await prisma.task.delete({ where: { id: taskId } })
  response.status(204).send()
})

const serverDirectory = path.dirname(fileURLToPath(import.meta.url))
app.use(express.static(path.resolve(serverDirectory, "../dist")))

app.listen(port, "127.0.0.1", () => {
  console.log(`TeamPlanner API: http://127.0.0.1:${port}`)
})

async function shutdown() {
  await prisma.$disconnect()
  process.exit(0)
}

process.on("SIGINT", shutdown)
process.on("SIGTERM", shutdown)
