import { useEffect, useState, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export type TeamDraft = { name: string; description: string }

type TeamDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (team: TeamDraft) => void
}

export function TeamDialog({ open, onOpenChange, onSubmit }: TeamDialogProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")

  useEffect(() => {
    if (!open) return
    setName("")
    setDescription("")
  }, [open])

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!name.trim() || !description.trim()) return
    onSubmit({ name: name.trim(), description: description.trim() })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Új csapat létrehozása</DialogTitle>
          <DialogDescription>A csapat létrehozójaként te leszel a vezetője.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="team-name">Csapat neve</Label>
            <Input id="team-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Például: Tartalomcsapat" autoFocus required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="team-description">Rövid leírás</Label>
            <Textarea id="team-description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Mivel foglalkozik ez a csapat?" required />
          </div>
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="ghost">Mégse</Button></DialogClose>
            <Button type="submit">Csapat létrehozása</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
