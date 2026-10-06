import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Team } from "@/types"

type TeamSwitcherProps = {
  teams: Team[]
  value: number
  canManage: boolean
  onValueChange: (teamId: number) => void
  onCreate: () => void
  onManageMembers: () => void
}

export function TeamSwitcher({ teams, value, canManage, onValueChange, onCreate, onManageMembers }: TeamSwitcherProps) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-[230px]">
        <p className="mb-2 text-xs font-semibold text-muted-foreground">Aktív csapat</p>
        <Select value={String(value)} onValueChange={(nextValue) => onValueChange(Number(nextValue))}>
          <SelectTrigger aria-label="Aktív csapat kiválasztása" className="bg-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {teams.map((team) => <SelectItem key={team.id} value={String(team.id)}>{team.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="flex gap-2">
        {canManage && <Button type="button" variant="outline" onClick={onManageMembers}>Csapattagok</Button>}
        <Button type="button" variant="outline" onClick={onCreate}>Új csapat</Button>
      </div>
    </div>
  )
}
