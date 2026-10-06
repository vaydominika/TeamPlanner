import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto"
import { promisify } from "node:util"

const scrypt = promisify(scryptCallback)
const keyLength = 64

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex")
  const key = await scrypt(password, salt, keyLength) as Buffer
  return `${salt}:${key.toString("hex")}`
}

export async function verifyPassword(password: string, storedHash: string) {
  const [salt, keyHex] = storedHash.split(":")
  if (!salt || !keyHex) return false

  const storedKey = Buffer.from(keyHex, "hex")
  if (storedKey.length !== keyLength) return false

  const candidateKey = await scrypt(password, salt, keyLength) as Buffer
  return timingSafeEqual(storedKey, candidateKey)
}

export function createSessionToken() {
  return randomBytes(32).toString("hex")
}

export function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex")
}
