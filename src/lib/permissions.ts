import type { Project, ProjectTask, User } from "../types.js"

export function canViewProject(user: User, project: Project) {
  return project.managerId === user.id || project.memberIds.includes(user.id)
}

export function canCreateProject(user: User) {
  return Boolean(user.id)
}

export function canManageProject(user: User, project: Project) {
  return project.managerId === user.id
}

export function canManageTask(user: User, project: Project, task: ProjectTask) {
  return task.projectId === project.id && canManageProject(user, project)
}

export function canUpdateAssignedTaskStatus(user: User, project: Project, task: ProjectTask) {
  return (
    canViewProject(user, project)
    && task.projectId === project.id
    && task.assigneeId === user.id
  )
}
