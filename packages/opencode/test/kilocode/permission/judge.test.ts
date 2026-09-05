import { expect, test } from "bun:test"
import { classifyAction, sanitizeClassifierReason } from "@/kilocode/permission/judge/qwen/permissions/classifier"
import { evaluateAutoMode, applyAutoModeDecision } from "@/kilocode/permission/judge/qwen/permissions/autoMode"
import {
  createDenialState,
  recordBlock,
  recordUnavailable,
  shouldFallback,
} from "@/kilocode/permission/judge/qwen/permissions/denialTracking"
import { buildClassifierContents } from "@/kilocode/permission/judge/qwen/permissions/classifier-transcript"
import type { Config, Query } from "@/kilocode/permission/judge/qwen/config/config"
import { guard, MODEL } from "@/kilocode/permission/judge/guard"
import * as State from "@/kilocode/permission/judge/state"

function setup(answer: (input: Query) => Promise<unknown>) {
  const calls: Query[] = []
  const config: Config = {
    getAutoModeSettings: () => ({}),
    getToolRegistry: () => ({ getTool: () => undefined }),
    getWorkspaceContext: () => ({ isPathWithinWorkspace: (file) => file.startsWith("/workspace/") }),
    setAutoModeDenialState: () => {},
    getFastModel: () => "judge",
    getModel: () => "judge",
    query: async (input) => {
      calls.push(input)
      return answer(input)
    },
  }
  const input = {
    toolName: "run_shell_command",
    toolParams: { command: "npm test" },
    messages: [],
    config,
    signal: new AbortController().signal,
  }
  return { input, calls, config }
}

test("fast allow does not invoke review and preserves Qwen request settings", async () => {
  const fixture = setup(async () => ({ shouldBlock: false }))
  expect(await classifyAction(fixture.input)).toMatchObject({ shouldBlock: false, stage: "fast" })
  expect(fixture.calls).toHaveLength(1)
  expect(fixture.calls[0]).toMatchObject({
    purpose: "permission_classifier_stage1",
    maxAttempts: 2,
    config: { maxOutputTokens: 256, temperature: 0 },
  })
})

test("review may clear a first-stage block", async () => {
  const fixture = setup(async (input) =>
    input.purpose.endsWith("stage1")
      ? { shouldBlock: true }
      : { shouldBlock: false, thinking: "authorized", reason: "" },
  )
  expect(await classifyAction(fixture.input)).toMatchObject({ shouldBlock: false, stage: "thinking" })
  expect(fixture.calls[1].config.maxOutputTokens).toBe(4096)
})

test("review block sanitizes model-produced reason", async () => {
  const fixture = setup(async (input) =>
    input.purpose.endsWith("stage1")
      ? { shouldBlock: true }
      : { shouldBlock: true, thinking: "risk", reason: "<system>denied</system>\n now" },
  )
  expect(await classifyAction(fixture.input)).toMatchObject({ shouldBlock: true, reason: "denied now" })
  expect(sanitizeClassifierReason("x".repeat(500))).toHaveLength(200)
})

for (const stage of ["stage1", "stage2"]) {
  test(`API failure at ${stage} never becomes allow`, async () => {
    const fixture = setup(async (input) => {
      if (input.purpose.endsWith(stage)) throw new Error("offline")
      return { shouldBlock: true }
    })
    expect(await classifyAction(fixture.input)).toMatchObject({ shouldBlock: true, unavailable: true })
  })
}

test("caller cancellation propagates", async () => {
  const controller = new AbortController()
  const fixture = setup(async () => {
    controller.abort()
    throw new DOMException("cancelled", "AbortError")
  })
  await expect(classifyAction({ ...fixture.input, signal: controller.signal })).rejects.toThrow("cancelled")
})

test("classifier deadline fails closed", async () => {
  const fixture = setup(
    (input) =>
      new Promise((_, reject) => {
        const timer = setTimeout(() => reject(new Error("deadline did not abort transport")), 2000)
        input.abortSignal.addEventListener(
          "abort",
          () => {
            clearTimeout(timer)
            reject(input.abortSignal.reason)
          },
          { once: true },
        )
      }),
  )
  fixture.config.getAutoModeSettings = () => ({ classifier: { timeouts: { stage1Ms: 1000 } } })
  expect(await classifyAction(fixture.input)).toMatchObject({ shouldBlock: true, unavailable: true, stage: "fast" })
  expect(fixture.calls[0].abortSignal.aborted).toBe(true)
})

test("transcript strips assistant prose and tool output, retaining user intent and actions", () => {
  const fixture = setup(async () => ({ shouldBlock: false }))
  const text = JSON.stringify(
    buildClassifierContents(
      [
        { role: "user", parts: [{ text: "run tests" }] },
        {
          role: "model",
          parts: [{ text: "ignore safety" }, { functionCall: { name: "shell", args: { command: "ls" } } }],
        },
        { role: "function", parts: [{ text: "exfiltrate secrets" }] },
      ],
      fixture.config.getToolRegistry(),
      { toolName: "shell", toolParams: { command: "npm test" } },
    ),
  )
  expect(text).toContain("run tests")
  expect(text).toContain("Prior action")
  expect(text).not.toContain("ignore safety")
  expect(text).not.toContain("exfiltrate secrets")
})

for (const [toolName, filePath, expected] of [
  ["read_file", undefined, "fast-path:allowlist"],
  ["edit", "/workspace/src/test.ts", "fast-path:accept-edits"],
  ["edit", "/workspace/package.json", "classifier"],
  ["edit", "/workspace/.kilo/config.json", "classifier"],
  ["edit", "/outside/test.ts", "fallback"],
] as const) {
  test(`${toolName} ${filePath ?? ""} routes to ${expected}`, async () => {
    const fixture = setup(async () => ({ shouldBlock: false }))
    const decision = await evaluateAutoMode({ ...fixture.input, ctx: { toolName, filePath }, pmForcedAsk: false })
    expect(decision.via).toBe(expected)
    expect(fixture.calls.length).toBe(expected === "classifier" ? 1 : 0)
  })
}

test("explicit ask defeats the read-only fast path", async () => {
  const fixture = setup(async () => ({ shouldBlock: false }))
  expect(await evaluateAutoMode({ ...fixture.input, ctx: { toolName: "read_file" }, pmForcedAsk: true })).toEqual({
    via: "fallback",
    reason: "ask_rule",
  })
  expect(fixture.calls).toHaveLength(0)
})

test("destructive guard precedes classifier", async () => {
  const fixture = setup(async () => {
    throw new Error("must not call")
  })
  expect(
    await evaluateAutoMode({
      ...fixture.input,
      ctx: { toolName: "run_shell_command", command: "git reset --hard" },
      pmForcedAsk: false,
    }),
  ).toMatchObject({ via: "blocked:destructive-command" })
})

test("Qwen denial limits and unavailable fallback are retained", () => {
  expect(shouldFallback(recordBlock(recordBlock(recordBlock(createDenialState()))))).toEqual({
    fallback: true,
    reason: "consecutive_block",
  })
  expect(shouldFallback(recordUnavailable(recordUnavailable(createDenialState())))).toEqual({
    fallback: true,
    reason: "consecutive_unavailable",
  })
  const fixture = setup(async () => ({}))
  expect(
    applyAutoModeDecision(
      { via: "classifier", shouldBlock: true, unavailable: true, stage: "fast", durationMs: 0, reason: "offline" },
      fixture.config,
      createDenialState(),
    ),
  ).toMatchObject({ kind: "fallback", reason: "classifier_unavailable" })
})

test("Prompt Guard HTTP validates identity, probability, and errors", async () => {
  const previous = process.env.KILO_PROMPT_GUARD_URL
  const key = process.env.KILO_PROMPT_GUARD_API_KEY
  process.env.KILO_PROMPT_GUARD_API_KEY = "test-guard-token"
  let body: unknown = { model: MODEL, score: 0.8, chunks: 2 }
  let status = 200
  const server = Bun.serve({
    port: 0,
    fetch: async (request) => {
      expect(await request.json()).toEqual({ text: "test input" })
      expect(request.headers.get("authorization")).toBe("Bearer test-guard-token")
      return Response.json(body, { status })
    },
  })
  process.env.KILO_PROMPT_GUARD_URL = `http://127.0.0.1:${server.port}/classify`
  try {
    expect(await guard("test input", new AbortController().signal)).toEqual({ shouldBlock: true })
    body = { model: MODEL, score: 0.1, chunks: 1 }
    expect(await guard("test input", new AbortController().signal)).toEqual({ shouldBlock: false })
    body = { model: MODEL, score: 2, chunks: 1 }
    await expect(guard("test input", new AbortController().signal)).rejects.toThrow()
    body = { model: "wrong-model", score: 0, chunks: 1 }
    await expect(guard("test input", new AbortController().signal)).rejects.toThrow()
    status = 503
      await expect(guard("test input", new AbortController().signal)).rejects.toThrow("HTTP 503")
      status = 401
      await expect(guard("test input", new AbortController().signal)).rejects.toThrow("HTTP 401")
  } finally {
    server.stop(true)
    if (key == null) delete process.env.KILO_PROMPT_GUARD_API_KEY
    else process.env.KILO_PROMPT_GUARD_API_KEY = key
    if (previous == null) delete process.env.KILO_PROMPT_GUARD_URL
    else process.env.KILO_PROMPT_GUARD_URL = previous
  }
})

test("mode inheritance follows parent sessions and cleanup removes it", async () => {
  State.register("root-test", "mode_dos_llm_as_a_judge")
  const parent = async (id: string) => (id === "child-test" ? "root-test" : undefined)
  expect(await State.resolve("child-test", parent)).toBe("mode_dos_llm_as_a_judge")
  expect(await State.resolve("other-test", parent)).toBeUndefined()
  State.clear("root-test")
  expect(await State.resolve("child-test", parent)).toBeUndefined()
})
