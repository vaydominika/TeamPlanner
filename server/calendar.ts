import { createHash, randomBytes, randomUUID } from "node:crypto"
import { PrismaClient } from "../prisma/generated/client/index.js"
import { hashSessionToken } from "./auth.js"
import { CalendarEventGoneError, calendarConfig, GoogleCalendarProvider, type CalendarCredentials, type CalendarProvider } from "./calendar-provider.js"
import { decryptSecret, encryptSecret, IntegrationError } from "./integration-security.js"

// Serialize upstream work, including disconnect, to prevent stale in-flight writes.
export class CalendarService {
  private queue: Promise<unknown> = Promise.resolve()
  constructor(private prisma: PrismaClient, private provider: CalendarProvider = new GoogleCalendarProvider()) {}
  private exclusive<T>(action: () => Promise<T>): Promise<T> {
    const result = this.queue.then(action)
    this.queue = result.catch(() => undefined)
    return result
  }

  async status(userId: string) {
    let configured = true
    try { calendarConfig(); encryptSecret("check") } catch { configured = false }
    const connection = await this.prisma.calendarConnection.findUnique({ where: { userId }, include: { events: true } })
    return {
      configured, connected: Boolean(connection?.credentials), provider: connection?.provider ?? null,
      pendingCount: connection?.credentials ? connection.events.filter((event) => event.dirty || event.taskId === null).length : 0,
      message: connection?.credentials ? connection.events.find((event) => event.lastError)?.lastError ?? null : null,
    }
  }

  async connect(userId: string, sessionToken: string) {
    if ((await this.prisma.calendarConnection.findUnique({ where: { userId } }))?.credentials) throw new IntegrationError("A naptár már csatlakoztatva van.", 409)
    const state = randomBytes(32).toString("hex")
    const verifier = randomBytes(32).toString("base64url")
    const url = this.provider.authorizationUrl(state, createHash("sha256").update(verifier).digest("base64url"))
    await this.prisma.calendarAuthorization.upsert({
      where: { userId },
      create: { userId, stateHash: hashSessionToken(state), sessionHash: hashSessionToken(sessionToken), verifier: encryptSecret(verifier), expiresAt: new Date(Date.now() + 600000) },
      update: { stateHash: hashSessionToken(state), sessionHash: hashSessionToken(sessionToken), verifier: encryptSecret(verifier), expiresAt: new Date(Date.now() + 600000) },
    })
    return url
  }

  complete(userId: string, sessionToken: string, state: string, code: string) {
    return this.exclusive(async () => {
      const authorization = await this.prisma.calendarAuthorization.findUnique({ where: { userId } })
      if (!authorization || authorization.stateHash !== hashSessionToken(state)
        || authorization.sessionHash !== hashSessionToken(sessionToken) || authorization.expiresAt <= new Date()) {
        throw new IntegrationError("A naptárcsatlakozás lejárt vagy érvénytelen. Indítsd újra.", 400)
      }
      await this.prisma.calendarAuthorization.delete({ where: { userId } })
      const credentials = await this.provider.exchange(code, decryptSecret(authorization.verifier))
      await this.prisma.calendarConnection.upsert({
        where: { userId },
        create: { id: randomUUID(), userId, provider: this.provider.name, credentials: encryptSecret(JSON.stringify(credentials)) },
        update: { provider: this.provider.name, credentials: encryptSecret(JSON.stringify(credentials)), events: { updateMany: { where: {}, data: { dirty: true, revision: { increment: 1 }, lastError: null } } } },
      })
    })
  }

  disconnect(userId: string) {
    return this.exclusive(async () => {
      const connection = await this.prisma.calendarConnection.findUnique({ where: { userId } })
      let message = "A naptárkapcsolat megszüntetve. A korábbi események a Google Naptárban maradnak."
      if (connection?.credentials) {
        try { await this.provider.revoke(JSON.parse(decryptSecret(connection.credentials))) }
        catch { message += " A Google-engedélyt a Google-fiókodban is vond vissza." }
        await this.prisma.calendarConnection.update({ where: { userId }, data: { credentials: null } })
      }
      await this.prisma.calendarAuthorization.deleteMany({ where: { userId } })
      return message
    })
  }

  async sync(userId: string, taskId: number) {
    return this.exclusive(async () => {
      const connection = await this.prisma.calendarConnection.findUnique({ where: { userId } })
      if (!connection?.credentials) throw new IntegrationError("Előbb csatlakoztasd a Google Naptárat.", 409)
      const event = await this.prisma.calendarEvent.upsert({
        where: { connectionId_taskId: { connectionId: connection.id, taskId } },
        create: { connectionId: connection.id, taskId, externalEventId: createHash("sha256").update(`teamplanner:${userId}:${taskId}`).digest("hex") },
        update: { dirty: true, revision: { increment: 1 } },
      })
      await this.processEvent(event.id)
    })
  }

  private async processEvent(id: number) {
    const event = await this.prisma.calendarEvent.findUnique({ where: { id }, include: { connection: true, task: { include: { project: true } } } })
    if (!event?.connection.credentials) return
    try {
      if (event.connection.provider !== this.provider.name) throw new IntegrationError("Ez a naptárszolgáltató nem támogatott.")
      let credentials = JSON.parse(decryptSecret(event.connection.credentials)) as CalendarCredentials
      if (credentials.expiresAt <= Date.now() + 60000) {
        credentials = await this.provider.refresh(credentials)
        await this.prisma.calendarConnection.update({ where: { id: event.connectionId }, data: { credentials: encryptSecret(JSON.stringify(credentials)) } })
      }
      const task = event.task
      const allowed = task && (task.project.managerId === event.connection.userId || (task.project.teamId !== null
        && await this.prisma.teamMember.findUnique({ where: { teamId_userId: { teamId: task.project.teamId, userId: event.connection.userId } } })))
      if (!allowed) {
        await this.provider.deleteEvent(credentials, event.externalEventId)
        await this.prisma.calendarEvent.delete({ where: { id } })
      } else {
        try {
          await this.provider.saveEvent(credentials, event.externalEventId, task)
        } catch (error) {
          if (!(error instanceof CalendarEventGoneError)) throw error
          const externalEventId = randomBytes(24).toString("hex")
          await this.prisma.calendarEvent.update({ where: { id }, data: { externalEventId } })
          await this.provider.saveEvent(credentials, externalEventId, task)
        }
        await this.prisma.calendarEvent.updateMany({ where: { id, revision: event.revision, taskId: task.id }, data: { dirty: false, lastError: null } })
      }
    } catch (error) {
      const message = error instanceof IntegrationError ? error.message : "A naptár szinkronizálása nem sikerült; újrapróbáljuk."
      await this.prisma.calendarEvent.updateMany({ where: { id }, data: { dirty: true, lastError: message } })
      throw new IntegrationError(message)
    }
  }

  reconcile() {
    return this.exclusive(async () => {
      const events = await this.prisma.calendarEvent.findMany({ where: { connection: { credentials: { not: null } }, OR: [{ dirty: true }, { taskId: null }] }, select: { id: true } })
      for (const event of events) {
        try { await this.processEvent(event.id) } catch { /* Persisted errors are shown in connection status; retry next pass. */ }
      }
    })
  }
}
