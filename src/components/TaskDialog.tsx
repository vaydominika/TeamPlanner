import { useEffect, useMemo, useState, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { getWorkloadConflictTasks, OVERLOAD_TASK_LIMIT } from "@/lib/workload"
import type { Project, ProjectTask, TaskStatus } from "@/types"

export type TaskDraft = Pick<ProjectTask, "name" | "description" | "assignee" | "deadline" | "status">

type TaskDialogProps = {
  open: boolean
  project: Project
  projects: Project[]
  tasks: ProjectTask[]
  task: ProjectTask | null
  onOpenChange: (open: boolean) => void
  onSubmit: (task: TaskDraft) => void
}

function formatDeadline(date: string) {
  return new Intl.DateTimeFormat("hu-HU", {
    month: "short",
    day: "numeric",
  }).format(new Date(`${date}T12:00:00`))
}

export function TaskDialog({ open, project, projects, tasks, task, onOpenChange, onSubmit }: TaskDialogProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [assignee, setAssignee] = useState("Nóra")
  const [deadline, setDeadline] = useState("")
  const [status, setStatus] = useState<TaskStatus>("Teendő")

  const isEditing = task !== null
  const isReadOnly = task !== null && task.projectId !== project.id
  const conflictTasks = useMemo(
    () => getWorkloadConflictTasks(tasks, assignee, deadline, task?.id),
    [assignee, deadline, task?.id, tasks],
  )
  const isOverloaded = conflictTasks.length >= OVERLOAD_TASK_LIMIT

  useEffect(() => {
    if (!open) return

    setName(task?.name ?? "")
    setDescription(task?.description ?? "")
    setAssignee(task?.assignee ?? "Nóra")
    setDeadline(task?.deadline ?? "")
    setStatus(task?.status ?? "Teendő")
  }, [open, task])

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (isReadOnly || !name.trim() || !description.trim() || !deadline) return

    onSubmit({ name: name.trim(), description: description.trim(), assignee, deadline, status })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Feladat szerkesztése" : "Új feladat létrehozása"}</DialogTitle>
          <DialogDescription>
            {isReadOnly
              ? "Ez a feladat másik projekthez tartozik, ezért itt csak megtekinthető."
              : `A feladat az „${project.name}” projekthez tartozik.`}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="task-name">Feladat neve</Label>
            <Input
              id="task-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Például: Meghívó szövegének megírása"
              autoFocus
              disabled={isReadOnly}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="task-description">Rövid leírás</Label>
            <Textarea
              id="task-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Mi a feladat pontos eredménye?"
              disabled={isReadOnly}
              required
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Felelős csapattag</Label>
              <Select value={assignee} onValueChange={setAssignee} disabled={isReadOnly}>
                <SelectTrigger aria-label="Felelős csapattag"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Nóra">Nóra</SelectItem>
                  <SelectItem value="Márk">Márk</SelectItem>
                  <SelectItem value="Eszter">Eszter</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-deadline">Határidő</Label>
              <Input
                id="task-deadline"
                type="text"
                inputMode="numeric"
                pattern="[0-9]{4}-[0-9]{2}-[0-9]{2}"
                value={deadline}
                onChange={(event) => setDeadline(event.target.value)}
                placeholder="Például: 2026-10-02"
                disabled={isReadOnly}
                required
              />
            </div>
          </div>

          {isOverloaded && (
            <div role="status" aria-live="polite" className="rounded-xl border border-[#e7b9c6] bg-[#fff4f7] p-4">
              <p className="text-sm font-bold text-foreground">Terhelési figyelmeztetés</p>
              <p className="mt-1 text-sm leading-relaxed text-[#70434f]">
                {assignee} a választott határidő előtt túlterhelt lehet: már {conflictTasks.length} befejezetlen feladata esik az előző hét napra. A feladat ettől még menthető.
              </p>
              <ul className="mt-3 space-y-2 border-t border-[#edced7] pt-3">
                {conflictTasks.map((conflictTask) => {
                  const conflictProject = projects.find((item) => item.id === conflictTask.projectId)
                  const belongsToAnotherProject = conflictTask.projectId !== project.id

                  return (
                    <li key={conflictTask.id} className="text-xs leading-relaxed text-muted-foreground">
                      <span className="font-bold text-foreground">{conflictTask.name}</span>
                      {` · ${conflictProject?.name ?? "Ismeretlen projekt"} · ${formatDeadline(conflictTask.deadline)}`}
                      {belongsToAnotherProject && " · Másik projekt, csak megtekinthető"}
                    </li>
                  )
                })}
              </ul>
            </div>
          )}

          <div className="space-y-2">
            <Label>Állapot</Label>
            <Select value={status} onValueChange={(value) => setStatus(value as TaskStatus)} disabled={isReadOnly}>
              <SelectTrigger aria-label="Feladat állapota"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Teendő">Teendő</SelectItem>
                <SelectItem value="Folyamatban">Folyamatban</SelectItem>
                <SelectItem value="Kész">Kész</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="ghost">{isReadOnly ? "Bezárás" : "Mégse"}</Button></DialogClose>
            {!isReadOnly && <Button type="submit">{isEditing ? "Módosítások mentése" : "Feladat létrehozása"}</Button>}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
