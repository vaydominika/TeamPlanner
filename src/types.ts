export type TaskStatus = "Teendő" | "Folyamatban" | "Kész"

export type Project = {
  id: number
  name: string
  description: string
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
