import assert from "node:assert/strict"
import test from "node:test"
import { createSessionToken, hashPassword, hashSessionToken, verifyPassword } from "./auth.js"

test("a jelszó csak a megfelelő értékkel ellenőrizhető", async () => {
  const passwordHash = await hashPassword("biztonsagos123")

  assert.equal(await verifyPassword("biztonsagos123", passwordHash), true)
  assert.equal(await verifyPassword("hibas-jelszo", passwordHash), false)
})

test("a munkamenet-token véletlenszerű és csak hashként tárolható", () => {
  const firstToken = createSessionToken()
  const secondToken = createSessionToken()

  assert.notEqual(firstToken, secondToken)
  assert.equal(hashSessionToken(firstToken), hashSessionToken(firstToken))
  assert.notEqual(hashSessionToken(firstToken), firstToken)
})
