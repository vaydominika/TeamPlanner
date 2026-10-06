import type { WorkloadEntry } from "@/types"

export const OVERLOAD_TASK_LIMIT = 2
const WORKLOAD_WINDOW_DAYS = 7

function parseDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null

  const date = new Date(`${value}T12:00:00`)
  return Number.isNaN(date.getTime()) ? null : date
}

export function getWorkloadConflictTasks(
  tasks: WorkloadEntry[],
  assignee: string,
  deadline: string,
  excludedTaskId?: number,
) {
  const deadlineDate = parseDate(deadline)
  if (!deadlineDate) return []

  const windowStart = new Date(deadlineDate)
  windowStart.setDate(windowStart.getDate() - WORKLOAD_WINDOW_DAYS)

  return tasks.filter((task) => {
    if (task.id === excludedTaskId || task.assignee !== assignee || task.status === "Kész") return false

    const taskDeadline = parseDate(task.deadline)
    return taskDeadline !== null && taskDeadline >= windowStart && taskDeadline <= deadlineDate
  })
}

export function hasWorkloadConflict(
  tasks: WorkloadEntry[],
  assignee: string,
  deadline: string,
  excludedTaskId?: number,
) {
  return getWorkloadConflictTasks(tasks, assignee, deadline, excludedTaskId).length >= OVERLOAD_TASK_LIMIT
}
