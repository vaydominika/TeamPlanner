import type { Project, ProjectTask, SessionData, Team } from "@/types"
import type { ProjectDraft } from "@/components/ProjectDialog"
import type { TaskDraft } from "@/components/TaskDialog"
import type { TeamDraft } from "@/components/TeamDialog"

type RequestOptions = Omit<RequestInit, "body"> & { body?: unknown }

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function apiRequest<T>(path: string, options: RequestOptions = {}) {
  const response = await fetch(path, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => null) as { message?: string } | null
    throw new ApiError(error?.message ?? "A kérés nem sikerült.", response.status)
  }

  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export function getSession() {
  return apiRequest<SessionData>("/api/session")
}

export function login(email: string, password: string) {
  return apiRequest<{ user: SessionData["currentUser"] }>("/api/auth/login", {
    method: "POST",
    body: { email, password },
  })
}

export function register(name: string, email: string, password: string) {
  return apiRequest<{ user: SessionData["currentUser"] }>("/api/auth/register", {
    method: "POST",
    body: { name, email, password },
  })
}

export function logout() {
  return apiRequest<void>("/api/auth/logout", { method: "POST" })
}

export function createTeam(team: TeamDraft) {
  return apiRequest<Team>("/api/teams", { method: "POST", body: team })
}

export function updateTeamMembers(teamId: number, memberIds: string[]) {
  return apiRequest<{ memberIds: string[] }>(`/api/teams/${teamId}/members`, { method: "PATCH", body: { memberIds } })
}

export function createProject(teamId: number, project: ProjectDraft) {
  return apiRequest<Project>("/api/projects", { method: "POST", body: { ...project, teamId } })
}

export function updateProject(projectId: number, project: ProjectDraft) {
  return apiRequest<Project>(`/api/projects/${projectId}`, { method: "PATCH", body: project })
}

export function deleteProject(projectId: number) {
  return apiRequest<void>(`/api/projects/${projectId}`, { method: "DELETE" })
}

export function createTask(projectId: number, task: TaskDraft) {
  return apiRequest<ProjectTask>(`/api/projects/${projectId}/tasks`, { method: "POST", body: task })
}

export function updateTask(taskId: number, task: TaskDraft | Pick<ProjectTask, "status">) {
  return apiRequest<ProjectTask>(`/api/tasks/${taskId}`, { method: "PATCH", body: task })
}

export function deleteTask(taskId: number) {
  return apiRequest<void>(`/api/tasks/${taskId}`, { method: "DELETE" })
}
