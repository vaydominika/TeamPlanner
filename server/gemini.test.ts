import assert from "node:assert/strict"
import { after, test } from "node:test"
import { createSummaryProvider, GeminiSummaryProvider, OpenAISummaryProvider, SummaryService } from "./summary.js"
import { IntegrationError } from "./integration-security.js"

const environment = { ...process.env }
const originalFetch = globalThis.fetch
const task = { name: "Meghívó", description: "A helyszín megadásával.", deadline: "2026-10-31", status: "Teendő", assignee: "Anna", project: { name: "Műhelynap" } }
const success = () => Response.json({ candidates: [{ finishReason: "STOP", content: { parts: [{ thought: true, text: "Belső gondolat" }, { text: "Készítsd el a meghívót október 31-ig." }] } }] })

after(() => { process.env = environment; globalThis.fetch = originalFetch })

test("a Gemini szolgáltató kiválasztható és nem vált át más fizetős szolgáltatásra", () => {
  process.env.LLM_PROVIDER = "gemini"
  assert.ok(createSummaryProvider() instanceof GeminiSummaryProvider)
  process.env.LLM_PROVIDER = "openai"
  assert.ok(createSummaryProvider() instanceof OpenAISummaryProvider)
  delete process.env.LLM_PROVIDER
  assert.ok(createSummaryProvider() instanceof OpenAISummaryProvider)
  process.env.LLM_PROVIDER = "invalid"
  assert.throws(() => createSummaryProvider(), IntegrationError)
})

test("a Gemini kérése szerveroldali kulcsot és kizárólag minimális feladatkontextust használ", async () => {
  process.env.LLM_PROVIDER = "gemini"
  process.env.GEMINI_API_KEY = "private-gemini-key"
  delete process.env.GEMINI_MODEL
  globalThis.fetch = async (url, init) => {
    assert.equal(String(url), "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent")
    assert.ok(!String(url).includes("private-gemini-key"))
    assert.equal(new Headers(init?.headers).get("x-goog-api-key"), "private-gemini-key")
    assert.ok(init?.signal)
    const body = JSON.parse(String(init?.body))
    assert.equal(body.contents.length, 1)
    assert.deepEqual(JSON.parse(body.contents[0].parts[0].text), { title: task.name, description: task.description, deadline: task.deadline, status: task.status, assignee: task.assignee, project: task.project.name })
    assert.equal(body.generationConfig.maxOutputTokens, 400)
    assert.equal(body.generationConfig.candidateCount, 1)
    assert.ok(body.systemInstruction.parts[0].text.includes("Magyarul"))
    return success()
  }
  try {
    assert.equal(await new SummaryService().generate({ ...task, unrelated: "secret" } as typeof task), "Készítsd el a meghívót október 31-ig.")
  } finally { globalThis.fetch = originalFetch }
})

test("hibás Gemini konfiguráció nem indít szolgáltatói kérést", async () => {
  const provider = new GeminiSummaryProvider()
  let calls = 0
  globalThis.fetch = async () => { calls++; return success() }
  try {
    delete process.env.GEMINI_API_KEY
    await assert.rejects(provider.summarize(task), IntegrationError)
    process.env.GEMINI_API_KEY = "private-gemini-key"
    process.env.GEMINI_MODEL = "../invalid?key=secret"
    await assert.rejects(provider.summarize(task), IntegrationError)
    assert.equal(calls, 0)
  } finally { globalThis.fetch = originalFetch; delete process.env.GEMINI_MODEL }
})

test("a Gemini elutasítja a hiányos, blokkolt és túl hosszú választ", async () => {
  const provider = new GeminiSummaryProvider()
  const invalid = [
    null, {}, { candidates: [null] }, { candidates: [{ finishReason: "STOP", content: { parts: [null, { text: 42 }] } }] },
    { candidates: [{ finishReason: "MAX_TOKENS", content: { parts: [{ text: "Félbeszakadt" }] } }] },
    { promptFeedback: { blockReason: "SAFETY" }, candidates: [{ finishReason: "STOP", content: { parts: [{ text: "Blokkolt" }] } }] },
    { candidates: [{ finishReason: "STOP", content: { parts: [{ text: "x".repeat(601) }] } }] },
  ]
  try {
    for (const body of invalid) {
      globalThis.fetch = async () => Response.json(body)
      await assert.rejects(provider.summarize(task), IntegrationError)
    }
    globalThis.fetch = async () => new Response("invalid json")
    await assert.rejects(provider.summarize(task), IntegrationError)
  } finally { globalThis.fetch = originalFetch }
})

test("a Gemini keret-, hozzáférési és hálózati hibái biztonságos magyar visszajelzést adnak", async () => {
  const provider = new GeminiSummaryProvider()
  try {
    for (const status of [401, 403, 404, 429, 500]) {
      globalThis.fetch = async () => new Response("private-provider-error", { status })
      await assert.rejects(provider.summarize(task), (error: unknown) => error instanceof IntegrationError
        && error.status === (status === 429 ? 429 : 503) && !error.message.includes("private"))
    }
    globalThis.fetch = async () => { throw new DOMException("Timeout", "TimeoutError") }
    await assert.rejects(provider.summarize(task), IntegrationError)
  } finally { globalThis.fetch = originalFetch }
})
