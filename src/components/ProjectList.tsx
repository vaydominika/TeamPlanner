import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { Project, ProjectTask } from "@/types"

type ProjectListProps = {
  projects: Project[]
  tasks: ProjectTask[]
  selectedProjectId: number
  onSelect: (projectId: number) => void
  onCreate: () => void
}

export function ProjectList({ projects, tasks, selectedProjectId, onSelect, onCreate }: ProjectListProps) {
  return (
    <aside aria-labelledby="projects-heading" className="lg:sticky lg:top-7 lg:self-start">
      <div className="mb-4 flex items-end justify-between gap-4">
        <h2 id="projects-heading" className="text-xl font-bold tracking-tight">Projektek</h2>
        <Button size="sm" variant="outline" onClick={onCreate}>Új projekt</Button>
      </div>

      <div className="space-y-3">
        {projects.map((project) => {
          const isSelected = selectedProjectId === project.id
          const taskCount = tasks.filter((task) => task.projectId === project.id).length

          return (
            <button
              key={project.id}
              type="button"
              className="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              onClick={() => onSelect(project.id)}
              aria-pressed={isSelected}
            >
              <Card
                className={cn(
                  "p-4 transition hover:border-primary/30 hover:bg-white",
                  isSelected && "border-primary/50 bg-white ring-1 ring-primary/10",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-bold leading-snug">{project.name}</h3>
                  <span className="shrink-0 rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-secondary-foreground">
                    {taskCount} feladat
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{project.description}</p>
              </Card>
            </button>
          )
        })}
      </div>
    </aside>
  )
}
