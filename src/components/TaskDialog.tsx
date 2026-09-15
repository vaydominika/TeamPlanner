import { useState, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { ProjectTask, TaskStatus } from "@/types"

type TaskDraft = Pick<ProjectTask, "name" | "description" | "assignee" | "deadline" | "status">

type TaskDialogProps = {
  open: boolean
  projectName: string
  onOpenChange: (open: boolean) => void
  onCreate: (task: TaskDraft) => void
}

export function TaskDialog({ open, projectName, onOpenChange, onCreate }: TaskDialogProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [assignee, setAssignee] = useState("Nóra")
  const [deadline, setDeadline] = useState("")
  const [status, setStatus] = useState<TaskStatus>("Teendő")

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!name.trim() || !description.trim() || !deadline) return
    onCreate({ name: name.trim(), description: description.trim(), assignee, deadline, status })
    setName("")
    setDescription("")
    setAssignee("Nóra")
    setDeadline("")
    setStatus("Teendő")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Új feladat létrehozása</DialogTitle>
          <DialogDescription>A feladat az „{projectName}” projekthez kerül.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="task-name">Feladat neve</Label>
            <Input id="task-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Például: Meghívó szövegének megírása" autoFocus required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="task-description">Rövid leírás</Label>
            <Textarea id="task-description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Mi a feladat pontos eredménye?" required />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Felelős csapattag</Label>
              <Select value={assignee} onValueChange={setAssignee}>
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
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Állapot</Label>
            <Select value={status} onValueChange={(value) => setStatus(value as TaskStatus)}>
              <SelectTrigger aria-label="Feladat állapota"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Teendő">Teendő</SelectItem>
                <SelectItem value="Folyamatban">Folyamatban</SelectItem>
                <SelectItem value="Kész">Kész</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="ghost">Mégse</Button></DialogClose>
            <Button type="submit">Feladat létrehozása</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
