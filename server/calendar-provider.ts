import { IntegrationError, providerRequest } from "./integration-security.js"
import type { SummaryContext } from "./summary.js"

export type CalendarCredentials = { accessToken: string; refreshToken: string; expiresAt: number }
export class CalendarEventGoneError extends IntegrationError {}
export interface CalendarProvider {
  name: string
  authorizationUrl(state: string, challenge: string): string
  exchange(code: string, verifier: string): Promise<CalendarCredentials>
  refresh(credentials: CalendarCredentials): Promise<CalendarCredentials>
  saveEvent(credentials: CalendarCredentials, eventId: string, task: SummaryContext): Promise<void>
  deleteEvent(credentials: CalendarCredentials, eventId: string): Promise<void>
  revoke(credentials: CalendarCredentials): Promise<void>
}

export function calendarConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const redirectUri = process.env.GOOGLE_REDIRECT_URI
  const appUrl = process.env.APP_URL
  if (!clientId || !clientSecret || !redirectUri || !appUrl) throw new IntegrationError("A Google Naptár kapcsolat nincs beállítva.")
  for (const value of [redirectUri, appUrl]) {
    const url = new URL(value)
    if (url.protocol !== "https:" && !(url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname))) {
      throw new IntegrationError("A naptárkapcsolat címei nem megfelelőek.")
    }
  }
  return { clientId, clientSecret, redirectUri, appUrl }
}

export function calendarEvent(task: SummaryContext) {
  const start = new Date(`${task.deadline}T00:00:00Z`)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(task.deadline) || Number.isNaN(start.getTime()) || !start.toISOString().startsWith(task.deadline)) {
    throw new IntegrationError("A feladat határideje érvénytelen.", 400)
  }
  const end = new Date(start.getTime() + 86400000).toISOString().slice(0, 10)
  return {
    summary: task.name, description: `${task.description}\n\nProjekt: ${task.project.name}`,
    start: { date: task.deadline }, end: { date: end },
  }
}

export class GoogleCalendarProvider implements CalendarProvider {
  name = "google"
  authorizationUrl(state: string, challenge: string) {
    const config = calendarConfig()
    const query = new URLSearchParams({
      client_id: config.clientId, redirect_uri: config.redirectUri, response_type: "code",
      scope: "https://www.googleapis.com/auth/calendar.events.owned", access_type: "offline",
      prompt: "consent", state, code_challenge: challenge, code_challenge_method: "S256",
    })
    return `https://accounts.google.com/o/oauth2/v2/auth?${query}`
  }

  private async token(parameters: Record<string, string>, previousRefreshToken = "") {
    const config = calendarConfig()
    const response = await providerRequest("https://oauth2.googleapis.com/token", {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: config.clientId, client_secret: config.clientSecret, ...parameters }),
    })
    if (!response.ok) throw new IntegrationError("A naptár engedélye lejárt vagy nem érvényes. Kapcsold le, majd csatlakoztasd újra.")
    const data = await response.json().catch(() => null) as { access_token?: string; refresh_token?: string; expires_in?: number; scope?: string } | null
    const refreshToken = data?.refresh_token || previousRefreshToken
    if (typeof data?.access_token !== "string" || !data.access_token || typeof refreshToken !== "string" || !refreshToken || typeof data.expires_in !== "number" || !Number.isFinite(data.expires_in) || data.expires_in <= 0
      || (data.scope && !data.scope.split(" ").includes("https://www.googleapis.com/auth/calendar.events.owned"))) {
      throw new IntegrationError("A naptárszolgáltató nem adott megfelelő engedélyt. Csatlakoztasd újra a naptárat.")
    }
    return { accessToken: data.access_token, refreshToken, expiresAt: Date.now() + data.expires_in * 1000 }
  }

  exchange(code: string, verifier: string) {
    return this.token({ grant_type: "authorization_code", code, code_verifier: verifier, redirect_uri: calendarConfig().redirectUri })
  }
  refresh(credentials: CalendarCredentials) {
    return this.token({ grant_type: "refresh_token", refresh_token: credentials.refreshToken }, credentials.refreshToken)
  }

  private eventRequest(credentials: CalendarCredentials, eventId: string, method: string, body?: unknown) {
    const base = "https://www.googleapis.com/calendar/v3/calendars/primary/events"
    return providerRequest(method === "POST" ? base : `${base}/${encodeURIComponent(eventId)}`, {
      method, headers: { Authorization: `Bearer ${credentials.accessToken}`, "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  }

  async saveEvent(credentials: CalendarCredentials, eventId: string, task: SummaryContext) {
    const body = calendarEvent(task)
    let response = await this.eventRequest(credentials, eventId, "PUT", body)
    if (response.status === 404) {
      response = await this.eventRequest(credentials, eventId, "POST", { id: eventId, ...body })
      // A retry after an uncertain insert updates the same ID instead of duplicating it.
      if (response.status === 409) {
        response = await this.eventRequest(credentials, eventId, "PUT", body)
        if (response.status === 404) throw new CalendarEventGoneError("A korábbi naptáreseményt törölték.")
      }
    }
    if (response.status === 410) throw new CalendarEventGoneError("A korábbi naptáreseményt törölték.")
    if (!response.ok) throw new IntegrationError("A naptár szinkronizálása nem sikerült. A feladat mentve maradt; újrapróbáljuk.")
  }

  async deleteEvent(credentials: CalendarCredentials, eventId: string) {
    const response = await this.eventRequest(credentials, eventId, "DELETE")
    if (!response.ok && ![404, 410].includes(response.status)) throw new IntegrationError("A naptáresemény törlése nem sikerült; újrapróbáljuk.")
  }

  async revoke(credentials: CalendarCredentials) {
    const response = await providerRequest("https://oauth2.googleapis.com/revoke", {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token: credentials.refreshToken }),
    })
    if (!response.ok && response.status !== 400) throw new IntegrationError("A Google-engedély visszavonása nem sikerült.")
  }
}
