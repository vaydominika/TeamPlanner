import { useEffect, useState, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { Project } from "@/types"

export type ProjectDraft = Pick<Project, "name" | "description">

type ProjectDialogProps = {
  open: boolean
  project: Project | null
  onOpenChange: (open: boolean) => void
  onSubmit: (project: ProjectDraft) => void
  onDelete?: () => void
}

export function ProjectDialog({ open, project, onOpenChange, onSubmit, onDelete }: ProjectDialogProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const isEditing = project !== null

  useEffect(() => {
    if (!open) return
    setName(project?.name ?? "")
    setDescription(project?.description ?? "")
  }, [open, project])

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!name.trim() || !description.trim()) return
    onSubmit({ name: name.trim(), description: description.trim() })
    onOpenChange(false)
  }

  function handleDelete() {
    if (!isEditing || !onDelete) return
    onDelete()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Projekt kezelése" : "Új projekt létrehozása"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Módosítsd a projekt alapadatait, vagy töröld a projektet."
              : "Adj rövid, könnyen felismerhető nevet és egy mondatos leírást a közös munkának."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="project-name">Projekt neve</Label>
            <Input id="project-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Például: Év végi csapatnap" autoFocus required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="project-description">Rövid leírás</Label>
            <Textarea id="project-description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Mivel foglalkozik a csapat ebben a projektben?" required />
          </div>
          {isEditing && onDelete && (
            <div className="border-t border-border pt-4">
              <Button type="button" variant="outline" className="text-[#874b5c]" onClick={handleDelete}>
                Projekt törlése
              </Button>
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="ghost">Mégse</Button></DialogClose>
            <Button type="submit">{isEditing ? "Módosítások mentése" : "Projekt létrehozása"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
