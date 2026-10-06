import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { hasWorkloadConflict } from "@/lib/workload"
import type { Project, ProjectTask, TaskStatus, User, WorkloadEntry } from "@/types"

const statusStyles: Record<TaskStatus, string> = {
  Teendő: "bg-[#f5e1e7] text-[#874b5c]",
  Folyamatban: "bg-[#e7ecd9] text-[#626f47]",
  Kész: "bg-[#dce9df] text-[#46614e]",
}

function formatDeadline(date: string) {
  return new Intl.DateTimeFormat("hu-HU", {
    month: "short",
    day: "numeric",
  }).format(new Date(`${date}T12:00:00`))
}

type TaskListProps = {
  project: Project
  tasks: ProjectTask[]
  workloadEntries: WorkloadEntry[]
  currentUser: User
  canManageProject: boolean
  onCreate: () => void
  onEdit: (task: ProjectTask) => void
  onManageProject: () => void
}

export function TaskList({
  project,
  tasks,
  workloadEntries,
  currentUser,
  canManageProject,
  onCreate,
  onEdit,
  onManageProject,
}: TaskListProps) {
  return (
    <section aria-labelledby="tasks-heading" className="min-w-0">
      <Card className="overflow-hidden border-border bg-white/85 backdrop-blur-sm">
        <div className="flex flex-col gap-4 border-b border-border/80 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
          <div>
            <h2 id="tasks-heading" className="text-2xl font-extrabold tracking-[-0.025em]">{project.name}</h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">{project.description}</p>
            {!canManageProject && (
              <p className="mt-2 text-xs font-semibold text-muted-foreground">
                A saját feladataid állapotát módosíthatod.
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2 self-start sm:self-center">
            {canManageProject && (
              <Button variant="outline" onClick={onManageProject}>Projekt kezelése</Button>
            )}
            <Button
              onClick={onCreate}
              disabled={!canManageProject}
              title={canManageProject ? undefined : "Ebben a projektben nem hozhatsz létre feladatot."}
            >
              Új feladat
            </Button>
          </div>
        </div>

        <CardContent className="p-3 sm:p-5">
          <div className="divide-y divide-border/70">
            {tasks.length === 0 ? (
              <div className="px-3 py-12 text-center">
                <p className="font-semibold">Ehhez a projekthez még nincs feladat.</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {canManageProject
                    ? "Az első feladatot az „Új feladat” gombbal veheted fel."
                    : "Az első feladatot a csapat vezetője veheti fel."}
                </p>
              </div>
            ) : (
              tasks.map((task) => {
                const isReadOnly = task.projectId !== project.id
                const hasConflict = hasWorkloadConflict(workloadEntries, task.assignee, task.deadline, task.id)
                const canChangeTask = !isReadOnly && (
                  canManageProject
                  || task.assignee === currentUser.name
                )

                return (
                  <article
                    key={task.id}
                    className={cn(
                      "grid gap-4 px-2 py-5 sm:grid-cols-[1fr_auto] sm:px-3",
                      hasConflict && "rounded-xl bg-[#fff7f9]",
                      isReadOnly && "bg-muted/55 text-muted-foreground",
                    )}
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <h3 className="font-bold leading-snug">{task.name}</h3>
                        <span className={cn("rounded-full px-2.5 py-1 text-xs font-bold", statusStyles[task.status])}>
                          {task.status}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{task.description}</p>
                      {hasConflict && (
                        <p className="mt-2 text-xs font-semibold text-[#874b5c]">
                          Sűrű határidők: {task.assignee} terhelése magas lehet ebben az időszakban.
                        </p>
                      )}
                      {isReadOnly && (
                        <p className="mt-2 text-xs font-semibold">Másik projekthez tartozik, ezért itt csak megtekinthető.</p>
                      )}
                    </div>
                    <div className="flex min-w-[220px] flex-col gap-3 sm:self-center">
                      <dl className="grid grid-cols-2 gap-x-6 gap-y-1">
                        <div>
                          <dt className="text-xs font-semibold text-muted-foreground">Felelős</dt>
                          <dd className="mt-1 text-sm font-bold">{task.assignee}</dd>
                        </div>
                        <div>
                          <dt className="text-xs font-semibold text-muted-foreground">Határidő</dt>
                          <dd className="mt-1 text-sm font-bold">{formatDeadline(task.deadline)}</dd>
                        </div>
                      </dl>
                      {canChangeTask && (
                        <Button type="button" size="sm" variant="outline" className="self-start" onClick={() => onEdit(task)}>
                          {canManageProject ? "Szerkesztés" : "Állapot módosítása"}
                        </Button>
                      )}
                    </div>
                  </article>
                )
              })
            )}
          </div>
        </CardContent>
      </Card>
    </section>
  )
}
