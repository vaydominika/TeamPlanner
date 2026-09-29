import { useMemo, useState } from "react"
import { ProjectDialog } from "@/components/ProjectDialog"
import { ProjectList } from "@/components/ProjectList"
import { TaskDialog } from "@/components/TaskDialog"
import { TaskList } from "@/components/TaskList"
import { initialProjects, initialTasks } from "@/data/sample-data"
import type { Project, ProjectTask } from "@/types"

function App() {
  const [projects, setProjects] = useState(initialProjects)
  const [tasks, setTasks] = useState(initialTasks)
  const [selectedProjectId, setSelectedProjectId] = useState(initialProjects[0].id)
  const [projectDialogOpen, setProjectDialogOpen] = useState(false)
  const [taskDialogOpen, setTaskDialogOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<ProjectTask | null>(null)
  const currentDate = new Intl.DateTimeFormat("hu-HU", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(new Date())

  const selectedProject = projects.find((project) => project.id === selectedProjectId) ?? projects[0]
  const selectedTasks = useMemo(
    () => tasks.filter((task) => task.projectId === selectedProject.id),
    [selectedProject.id, tasks],
  )

  function createProject(name: string, description: string) {
    const project: Project = {
      id: Date.now(),
      name,
      description,
    }
    setProjects((current) => [...current, project])
    setSelectedProjectId(project.id)
  }

  function openTaskCreation() {
    setEditingTask(null)
    setTaskDialogOpen(true)
  }

  function openTaskEditing(task: ProjectTask) {
    if (task.projectId !== selectedProject.id) return

    setEditingTask(task)
    setTaskDialogOpen(true)
  }

  function saveTask(task: Omit<ProjectTask, "id" | "projectId">) {
    if (editingTask) {
      if (editingTask.projectId !== selectedProject.id) return

      setTasks((current) => current.map((item) => (
        item.id === editingTask.id ? { ...item, ...task } : item
      )))
      return
    }

    setTasks((current) => [...current, { ...task, id: Date.now(), projectId: selectedProject.id }])
  }

  return (
    <div className="min-h-screen">
      <header className="px-5 pt-5 sm:px-8 sm:pt-7">
        <nav
          aria-label="Fő navigáció"
          className="mx-auto flex max-w-6xl items-center justify-between gap-4 rounded-2xl border border-border bg-card px-5 py-4 sm:px-6"
        >
          <p className="text-lg font-extrabold tracking-[-0.03em] text-foreground">TeamPlanner</p>
          <time className="text-sm font-medium text-muted-foreground">{currentDate}</time>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-10">
        <div className="mb-8 max-w-2xl">
          <h1 className="text-3xl font-extrabold tracking-[-0.035em] sm:text-4xl">Min dolgozunk most?</h1>
        </div>

        <div className="grid gap-7 lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start">
          <ProjectList
            projects={projects}
            tasks={tasks}
            selectedProjectId={selectedProject.id}
            onSelect={setSelectedProjectId}
            onCreate={() => setProjectDialogOpen(true)}
          />
          <TaskList
            project={selectedProject}
            tasks={selectedTasks}
            allTasks={tasks}
            onCreate={openTaskCreation}
            onEdit={openTaskEditing}
          />
        </div>
      </main>

      <ProjectDialog open={projectDialogOpen} onOpenChange={setProjectDialogOpen} onCreate={createProject} />
      <TaskDialog
        open={taskDialogOpen}
        project={selectedProject}
        projects={projects}
        tasks={tasks}
        task={editingTask}
        onOpenChange={setTaskDialogOpen}
        onSubmit={saveTask}
      />
    </div>
  )
}

export default App
