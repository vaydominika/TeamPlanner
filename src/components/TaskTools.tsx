import { useState } from "react"
import { Button } from "@/components/ui/button"
import { generateTaskSummary, syncTaskCalendar } from "@/lib/api"

export function TaskTools({ taskId }: { taskId: number }) {
  const [summary, setSummary] = useState("")
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState<"summary" | "calendar" | null>(null)

  async function run(action: "summary" | "calendar") {
    setBusy(action)
    setError("")
    setMessage("")
    try {
      if (action === "summary") setSummary((await generateTaskSummary(taskId)).summary)
      else setMessage((await syncTaskCalendar(taskId)).message)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "A művelet nem sikerült.")
    } finally { setBusy(null) }
  }

  return (
    <div className="mt-3 space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="ghost" disabled={busy !== null} onClick={() => run("summary")}>
          {busy === "summary" ? "Összefoglaló készül…" : "Összefoglaló készítése"}
        </Button>
        <Button type="button" size="sm" variant="ghost" disabled={busy !== null} onClick={() => run("calendar")}>
          {busy === "calendar" ? "Szinkronizálás…" : "Naptárba szinkronizálás"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">Az összefoglalás elküldi ennek a feladatnak az adatait a szöveges szolgáltatásnak.</p>
      {summary && <div role="status" className="rounded-xl border border-border bg-muted/40 p-3 text-sm leading-relaxed"><p className="mb-1 font-bold">Rövid összefoglaló</p>{summary}</div>}
      {message && <p role="status" className="text-sm text-[#46614e]">{message}</p>}
      {error && <p role="alert" className="text-sm text-[#874b5c]">{error}</p>}
    </div>
  )
}
