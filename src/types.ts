export type TaskStatus = "Teendő" | "Folyamatban" | "Kész"
export type User = {
  id: string
  name: string
}

export type Team = {
  id: number
  name: string
  description: string
  leaderId: string
  memberIds: string[]
}

export type Project = {
  id: number
  name: string
  description: string
  managerId: string
  teamId: number
  memberIds: string[]
}

export type ProjectTask = {
  id: number
  projectId: number
  name: string
  description: string
  assignee: string
  deadline: string
  status: TaskStatus
}

export type WorkloadEntry = {
  id: number
  assignee: string
  deadline: string
  status: TaskStatus
  projectId: number | null
  name: string | null
}

export type SessionData = {
  currentUser: User
  users: User[]
  teams: Team[]
  projects: Project[]
  tasks: ProjectTask[]
  workloadEntries: WorkloadEntry[]
}
