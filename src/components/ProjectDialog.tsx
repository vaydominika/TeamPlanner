import { useState, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

type ProjectDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (name: string, description: string) => void
}

export function ProjectDialog({ open, onOpenChange, onCreate }: ProjectDialogProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!name.trim() || !description.trim()) return
    onCreate(name.trim(), description.trim())
    setName("")
    setDescription("")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Új projekt létrehozása</DialogTitle>
          <DialogDescription>Adj rövid, könnyen felismerhető nevet és egy mondatos leírást a közös munkának.</DialogDescription>
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
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="ghost">Mégse</Button></DialogClose>
            <Button type="submit">Projekt létrehozása</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
