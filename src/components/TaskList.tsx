import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { Project, ProjectTask, TaskStatus } from "@/types"

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
  onCreate: () => void
}

export function TaskList({ project, tasks, onCreate }: TaskListProps) {
  return (
    <section aria-labelledby="tasks-heading" className="min-w-0">
      <Card className="overflow-hidden border-border bg-white/85 backdrop-blur-sm">
        <div className="flex flex-col gap-4 border-b border-border/80 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
          <div>
            <h2 id="tasks-heading" className="text-2xl font-extrabold tracking-[-0.025em]">{project.name}</h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">{project.description}</p>
          </div>
          <Button className="self-start sm:self-center" onClick={onCreate}>Új feladat</Button>
        </div>

        <CardContent className="p-3 sm:p-5">
          <div className="divide-y divide-border/70">
            {tasks.length === 0 ? (
              <div className="px-3 py-12 text-center">
                <p className="font-semibold">Ehhez a projekthez még nincs feladat.</p>
                <p className="mt-1 text-sm text-muted-foreground">Az első feladatot az „Új feladat” gombbal veheted fel.</p>
              </div>
            ) : (
              tasks.map((task) => (
                <article key={task.id} className="grid gap-4 px-2 py-5 sm:grid-cols-[1fr_auto] sm:px-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h3 className="font-bold leading-snug">{task.name}</h3>
                      <span className={cn("rounded-full px-2.5 py-1 text-xs font-bold", statusStyles[task.status])}>
                        {task.status}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{task.description}</p>
                  </div>
                  <dl className="grid grid-cols-2 gap-x-6 gap-y-1 sm:min-w-[220px] sm:self-center">
                    <div>
                      <dt className="text-xs font-semibold text-muted-foreground">Felelős</dt>
                      <dd className="mt-1 text-sm font-bold">{task.assignee}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold text-muted-foreground">Határidő</dt>
                      <dd className="mt-1 text-sm font-bold">{formatDeadline(task.deadline)}</dd>
                    </div>
                  </dl>
                </article>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </section>
  )
}
