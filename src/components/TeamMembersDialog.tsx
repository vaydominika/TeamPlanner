import { useEffect, useState, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { Team, User } from "@/types"

type TeamMembersDialogProps = {
  open: boolean
  team: Team
  users: User[]
  onOpenChange: (open: boolean) => void
  onSave: (memberIds: string[]) => void
}

export function TeamMembersDialog({ open, team, users, onOpenChange, onSave }: TeamMembersDialogProps) {
  const [memberIds, setMemberIds] = useState<string[]>(team.memberIds)

  useEffect(() => {
    if (open) setMemberIds(team.memberIds)
  }, [open, team.memberIds])

  function toggleMember(userId: string) {
    if (userId === team.leaderId) return
    setMemberIds((current) => current.includes(userId)
      ? current.filter((id) => id !== userId)
      : [...current, userId])
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    onSave(Array.from(new Set([...memberIds, team.leaderId])))
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Csapattagok kezelése</DialogTitle>
          <DialogDescription>Válaszd ki, kik tartozzanak a(z) „{team.name}” csapathoz.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="divide-y divide-border rounded-xl border border-border">
            {users.map((user) => {
              const isLeader = user.id === team.leaderId
              return (
                <label key={user.id} className="flex items-center justify-between gap-4 px-4 py-3">
                  <span>
                    <span className="block text-sm font-bold">{user.name}</span>
                    <span className="block text-xs text-muted-foreground">{isLeader ? "A csapat vezetője" : "Tag"}</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={isLeader || memberIds.includes(user.id)}
                    disabled={isLeader}
                    onChange={() => toggleMember(user.id)}
                    className="h-4 w-4 accent-[#eab8c6]"
                    aria-label={`${user.name} csapattagsága`}
                  />
                </label>
              )
            })}
          </div>
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="ghost">Mégse</Button></DialogClose>
            <Button type="submit">Tagok mentése</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
