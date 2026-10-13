import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { connectCalendar, disconnectCalendar, getCalendarStatus, type CalendarStatus } from "@/lib/api"

export function CalendarDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [status, setStatus] = useState<CalendarStatus | null>(null)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    let active = true
    const refresh = () => getCalendarStatus().then((value) => { if (active) { setStatus(value); setError("") } })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "A kapcsolat nem ellenőrizhető.") })
    void refresh()
    const timer = setInterval(refresh, 30000)
    return () => { active = false; clearInterval(timer) }
  }, [open])

  async function changeConnection() {
    setBusy(true)
    setError("")
    setMessage("")
    try {
      if (status?.connected) {
        setMessage((await disconnectCalendar()).message)
        setStatus(await getCalendarStatus())
      } else {
        const { url } = await connectCalendar()
        window.location.assign(url)
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "A művelet nem sikerült.")
    } finally { setBusy(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Naptárkapcsolat</DialogTitle>
          <DialogDescription>A határidős feladatokat a saját Google Naptáradba küldheted.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 text-sm leading-relaxed">
          <p>{status ? status.connected ? "Google Naptár csatlakoztatva." : "Nincs csatlakoztatott naptár." : "Kapcsolat ellenőrzése…"}</p>
          {status && !status.configured && <p>A szolgáltatást az üzemeltetőnek még be kell állítania.</p>}
          <p>A feladatnál válaszd a „Naptárba szinkronizálás” gombot. A név, leírás, határidő és projektnév kerül a naptárba; a későbbi módosítások automatikusan frissülnek.</p>
          <p>Lekapcsolás után a korábbi események megmaradnak, és már nem frissülnek. A belépési adatokat töröljük, az eseményazonosítókat megőrizzük. Újracsatlakozva folytatódik a korábban exportált feladatok szinkronizálása.</p>
          {Boolean(status?.pendingCount) && <p role="status">Függőben lévő műveletek: {status?.pendingCount}. A szerver félpercenként újrapróbálja őket.</p>}
          {status?.message && <p role="alert" className="text-[#874b5c]">{status.message}</p>}
          {message && <p role="status">{message}</p>}
          {error && <p role="alert" className="text-[#874b5c]">{error}</p>}
          <Button type="button" variant="outline" disabled={busy || !status || (!status.connected && !status.configured)} onClick={changeConnection}>
            {busy ? "Folyamatban…" : status?.connected ? "Naptár lekapcsolása" : "Google Naptár csatlakoztatása"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
