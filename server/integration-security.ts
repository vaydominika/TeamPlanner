import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto"

export class IntegrationError extends Error {
  constructor(message: string, public status = 503) { super(message) }
}

function encryptionKey() {
  const value = process.env.INTEGRATION_ENCRYPTION_KEY ?? ""
  if (!/^[a-f0-9]{64}$/i.test(value)) throw new IntegrationError("A naptárkapcsolat titkosítása nincs beállítva.")
  return Buffer.from(value, "hex")
}

export function encryptSecret(value: string) {
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv)
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()])
  return [iv, cipher.getAuthTag(), encrypted].map((part) => part.toString("base64")).join(".")
}

export function decryptSecret(value: string) {
  try {
    const [iv, tag, encrypted] = value.split(".").map((part) => Buffer.from(part, "base64"))
    const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv)
    decipher.setAuthTag(tag)
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8")
  } catch {
    throw new IntegrationError("A naptárkapcsolat nem olvasható. Ellenőrizd a titkosítási kulcsot.")
  }
}

export async function providerRequest(url: string, init: RequestInit, timeout = 10000) {
  try {
    return await fetch(url, { ...init, signal: AbortSignal.timeout(timeout) })
  } catch {
    throw new IntegrationError("A külső szolgáltatás nem érhető el vagy túllépte az időkorlátot. Próbáld újra később.")
  }
}
