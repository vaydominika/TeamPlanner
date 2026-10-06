import { PrismaClient } from "./generated/client/index.js"
import { hashPassword } from "../server/auth.js"

const prisma = new PrismaClient()

type DemoTask = {
  name: string
  description: string
  assignee: string
  deadline: string
  status: string
}

async function ensureProject(
  teamId: number,
  managerId: string,
  name: string,
  description: string,
) {
  const existingProject = await prisma.project.findFirst({ where: { managerId, name } })
  const project = existingProject
    ? await prisma.project.update({ where: { id: existingProject.id }, data: { description, teamId } })
    : await prisma.project.create({ data: { managerId, teamId, name, description } })

  return project
}

async function ensureTeam(leaderId: string, name: string, description: string, memberIds: string[]) {
  const existingTeam = await prisma.team.findFirst({ where: { leaderId, name } })
  const team = existingTeam
    ? await prisma.team.update({ where: { id: existingTeam.id }, data: { description } })
    : await prisma.team.create({ data: { leaderId, name, description } })

  for (const userId of new Set([...memberIds, leaderId])) {
    await prisma.teamMember.upsert({
      where: { teamId_userId: { teamId: team.id, userId } },
      update: {},
      create: { teamId: team.id, userId },
    })
  }

  return team
}

async function ensureTask(projectId: number, task: DemoTask) {
  const existingTask = await prisma.task.findFirst({ where: { projectId, name: task.name } })
  if (existingTask) {
    await prisma.task.update({ where: { id: existingTask.id }, data: task })
  } else {
    await prisma.task.create({ data: { projectId, ...task } })
  }
}

async function main() {
  const passwordHash = await hashPassword("demo1234")
  const demoUsers = [
    { id: "nora", name: "Nóra", email: "nora@teamplanner.hu", role: "team-member" },
    { id: "mark", name: "Márk", email: "mark@teamplanner.hu", role: "team-member" },
    { id: "eszter", name: "Eszter", email: "eszter@teamplanner.hu", role: "team-member" },
    { id: "daniel", name: "Dániel", email: "daniel@teamplanner.hu", role: "team-member" },
  ]

  for (const user of demoUsers) {
    await prisma.user.upsert({
      where: { id: user.id },
      update: { name: user.name, email: user.email, role: user.role },
      create: { ...user, passwordHash },
    })
  }

  const creativeTeam = await ensureTeam(
    "eszter",
    "Kreatív csapat",
    "Közös események és megjelenések szervezése.",
    ["nora", "mark", "eszter"],
  )
  const clientTeam = await ensureTeam(
    "daniel",
    "Ügyfélmunka",
    "Ügyfeleknek készülő anyagok összehangolása.",
    ["mark", "eszter", "daniel"],
  )

  const workshop = await ensureProject(
    creativeTeam.id,
    "eszter",
    "Őszi műhelynap",
    "A csapat októberi közös napjának előkészítése.",
  )
  const website = await ensureProject(
    creativeTeam.id,
    "eszter",
    "Honlap frissítés",
    "Szövegek és képek rendezése az új bemutatkozó oldalhoz.",
  )
  const handbook = await ensureProject(
    clientTeam.id,
    "daniel",
    "Ügyfélkézikönyv",
    "Rövid, érthető útmutató az új ügyfeleknek.",
  )

  const tasks: Array<[number, DemoTask]> = [
    [workshop.id, { name: "Helyszín véglegesítése", description: "Visszajelzés kérése a tárgyaló foglalásáról.", assignee: "Nóra", deadline: "2026-10-09", status: "Folyamatban" }],
    [workshop.id, { name: "Ebédigények összegyűjtése", description: "Kérdezzük meg a csapatot az ételérzékenységekről.", assignee: "Márk", deadline: "2026-10-12", status: "Teendő" }],
    [workshop.id, { name: "Napirend első változata", description: "A közös témák és a szünetek időrendjének összeállítása.", assignee: "Eszter", deadline: "2026-10-07", status: "Kész" }],
    [website.id, { name: "Bemutatkozó szöveg átnézése", description: "Rövidítsük és tegyük közvetlenebbé a nyitó szöveget.", assignee: "Eszter", deadline: "2026-10-14", status: "Folyamatban" }],
    [website.id, { name: "Csapatfotók kiválasztása", description: "Három egységes hangulatú kép kiválasztása.", assignee: "Nóra", deadline: "2026-10-16", status: "Teendő" }],
    [handbook.id, { name: "Tartalomjegyzék összeállítása", description: "A kézikönyv rövid fejezeteinek sorrendbe rendezése.", assignee: "Márk", deadline: "2026-10-20", status: "Teendő" }],
    [handbook.id, { name: "Borítóvázlat véleményezése", description: "A két borítóváltozat rövid átnézése és visszajelzése.", assignee: "Nóra", deadline: "2026-10-15", status: "Folyamatban" }],
  ]

  for (const [projectId, task] of tasks) await ensureTask(projectId, task)

  console.log("A TeamPlanner bemutató adatai elkészültek, a meglévő fiókok megmaradtak.")
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error)
    await prisma.$disconnect()
    process.exit(1)
  })
