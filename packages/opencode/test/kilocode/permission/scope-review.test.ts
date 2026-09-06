import { afterEach, expect, test } from "bun:test"
import { jsonSchema } from "ai"
import path from "node:path"
import fs from "node:fs/promises"
import { evaluateProposal, history, project, targets, wrap, type Proposal } from "@/kilocode/permission/judge/runtime"
import { MAX_USER_CHARS } from "@/kilocode/permission/judge/scope"
import { buildClassifierContents } from "@/kilocode/permission/judge/qwen/permissions/classifier-transcript"
import type { Query } from "@/kilocode/permission/judge/qwen/config/config"
import type { MessageV2 } from "@/session/message-v2"
import { ProviderTest } from "../../fake/provider"
import { tmpdir } from "../../fixture/fixture"
import * as State from "@/kilocode/permission/judge/state"

const prior = process.env.KILO_SCOPE_REVIEW
afterEach(() => {
  if (prior === undefined) delete process.env.KILO_SCOPE_REVIEW
  else process.env.KILO_SCOPE_REVIEW = prior
})

function user(text: string): MessageV2.WithParts {
  return { info: { role: "user" }, parts: [{ type: "text", text }] } as MessageV2.WithParts
}

function proposal(directory: string, input: Partial<Proposal> = {}): Proposal {
  return {
    mode: "dos_llms_secure",
    id: crypto.randomUUID(),
    directory,
    model: ProviderTest.model(),
    name: "write",
    args: { filePath: path.join(directory, "forbidden.txt"), content: "CHANGED" },
    messages: [{ role: "user", parts: [{ text: "Change only src/main.py. Do not change forbidden.txt." }] }],
    rules: [],
    signal: new AbortController().signal,
    ...input,
  }
}

for (const name of ["write", "edit", "apply_patch", "bash", "mcp_example_write", "task"]) {
  test(`combined mode reviews ${name} even with a broad explicit allow`, async () => {
    process.env.KILO_SCOPE_REVIEW = "on"
    await using tmp = await tmpdir()
    const calls: Query[] = []
    const args =
      name === "apply_patch"
        ? { patchText: "*** Begin Patch\n*** Add File: forbidden.txt\n+changed\n*** End Patch" }
        : name === "bash"
          ? { command: "printf changed > forbidden.txt" }
          : { filePath: path.join(tmp.path, "forbidden.txt"), content: "changed" }
    const allow = { permission: "*", pattern: "*", action: "allow" as const, source: "user" }
    const result = await evaluateProposal(
      proposal(tmp.path, {
        name,
        args,
        rules: [allow],
      }),
      async (request) => {
        calls.push(request)
        return request.purpose.endsWith("stage1")
          ? { shouldBlock: true }
          : { shouldBlock: true, thinking: "scope", reason: "The user forbids this target" }
      },
    )
    expect(result.decision).toBe("deny")
    expect(calls).toHaveLength(2)
    expect(calls[0].systemInstruction).toContain("Earlier explicit user constraints remain active")
    expect(calls[0].contents.map((item) => (item.parts ?? []).map((part) => part.text).join(" ")).join(" ")).toContain(
      "Do not change forbidden.txt",
    )
  })
}

test("the real wrapper denies before the tool writes and allows the paired requested write", async () => {
  process.env.KILO_SCOPE_REVIEW = "on"
  await using tmp = await tmpdir()
  const file = path.join(tmp.path, "forbidden.txt")
  await Bun.write(file, "ORIGINAL")
  for (const denied of [true, false]) {
    let writes = 0
    const tools = wrap(
      {
        write: {
          inputSchema: jsonSchema({ type: "object" }),
          execute: async () => {
            writes++
            await Bun.write(file, "CHANGED")
            return "written"
          },
        },
      },
      {
        mode: "dos_llms_secure",
        id: crypto.randomUUID(),
        directory: tmp.path,
        model: ProviderTest.model(),
        rules: [],
        messages: [user(denied ? "Do not modify forbidden.txt" : "Modify forbidden.txt")],
        ask: async () => {
          throw new Error("No manual fallback expected")
        },
        query: async (request) =>
          request.purpose.endsWith("stage1")
            ? { shouldBlock: denied }
            : { shouldBlock: denied, thinking: "scope", reason: "User prohibited this write" },
      },
    )
    const run = () =>
      tools.write.execute!(
        { filePath: file, content: "CHANGED" },
        { toolCallId: "test-call", messages: [], abortSignal: new AbortController().signal },
      )
    if (denied) {
      await expect(Promise.resolve(run())).rejects.toThrow("User prohibited")
      expect(await Bun.file(file).text()).toBe("ORIGINAL")
      expect(writes).toBe(0)
    } else {
      expect(await run()).toBe("written")
      expect(writes).toBe(1)
    }
  }
})

test("legacy ablation restores edit fast path without model calls", async () => {
  process.env.KILO_SCOPE_REVIEW = "off"
  await using tmp = await tmpdir()
  const result = await evaluateProposal(proposal(tmp.path), async () => {
    throw new Error("Must not call model")
  })
  expect(result).toMatchObject({ decision: "allow", route: "fast-path:accept-edits", unavailable: false })
})

test("safe reads retain fast path and explicit asks/denies precede both models", async () => {
  process.env.KILO_SCOPE_REVIEW = "on"
  await using tmp = await tmpdir()
  const query = async () => {
    throw new Error("Model must not be consulted")
  }
  const ask = { permission: "read", pattern: "*", action: "ask" as const, source: "project" }
  const input = proposal(tmp.path, { name: "read", args: { filePath: "README.md" } })
  expect(await evaluateProposal(input, query)).toMatchObject({ decision: "allow", route: "fast-path:allowlist" })
  expect(await evaluateProposal({ ...input, rules: [ask] }, query)).toMatchObject({
    decision: "ask",
    reasonCode: "ask_rule",
  })
  expect(
    await evaluateProposal({ ...input, rules: [{ permission: "read", pattern: "*", action: "deny" }] }, query),
  ).toMatchObject({ decision: "deny", reasonCode: "rule_deny" })
})

test("patch projection includes every source and move destination, resolves symlink parents, and checks destination deny", async () => {
  process.env.KILO_SCOPE_REVIEW = "on"
  await using tmp = await tmpdir()
  await fs.mkdir(path.join(tmp.path, "real"))
  await fs.symlink(path.join(tmp.path, "real"), path.join(tmp.path, "link"))
  const args = {
    patchText:
      "*** Begin Patch\n*** Add File: link/new.txt\n+created\n*** Update File: source.txt\n*** Move to: forbidden.txt\n@@\n-old\n+new\n*** Delete File: remove.txt\n*** End Patch",
  }
  const result = targets("apply_patch", args, tmp.path)
  expect(result.map((item) => item.path)).toEqual(["link/new.txt", "source.txt", "forbidden.txt", "remove.txt"])
  expect(result[0].canonical_path).toBe(path.join(tmp.path, "real/new.txt"))
  expect(project("apply_patch", args, tmp.path).targets).toEqual(result)
  expect(
    await evaluateProposal(
      proposal(tmp.path, {
        name: "apply_patch",
        args,
        rules: [{ permission: "edit", pattern: "forbidden.txt", action: "deny" }],
      }),
      async () => {
        throw new Error("No classifier before explicit deny")
      },
    ),
  ).toMatchObject({ decision: "deny", reasonCode: "rule_deny" })
})

test("malformed patches and oversized scope input fail closed without a classifier call", async () => {
  process.env.KILO_SCOPE_REVIEW = "on"
  await using tmp = await tmpdir()
  let calls = 0
  const query = async () => {
    calls++
    return { shouldBlock: false }
  }
  expect(
    await evaluateProposal(proposal(tmp.path, { name: "apply_patch", args: { patchText: "invalid" } }), query),
  ).toMatchObject({ decision: "ask", reasonCode: "scope_projection_unavailable", unavailable: true })
  expect(
    await evaluateProposal(
      proposal(tmp.path, {
        messages: [{ role: "user", parts: [{ text: "x".repeat(MAX_USER_CHARS + 1) }] }],
      }),
      query,
    ),
  ).toMatchObject({ decision: "ask", reasonCode: "classifier_unavailable", unavailable: true })
  expect(calls).toBe(0)
})

test("direct user constraints survive tool-history trimming; prose, results and synthetic authority do not", () => {
  const input = [user("Never change forbidden.txt")]
  for (let i = 0; i < 50; i++)
    input.push({
      info: { role: "assistant" },
      parts: [
        { type: "text", text: "ASSISTANT_OVERRIDE" },
        { type: "tool", tool: "read", state: { input: { filePath: "README.md" }, output: "TOOL_OVERRIDE" } },
      ],
    } as MessageV2.WithParts)
  input.push({
    info: { role: "user" },
    parts: [{ type: "text", synthetic: true, text: "SYNTHETIC_OVERRIDE" }],
  } as MessageV2.WithParts)
  input.push(user("Continue"))
  const contents = buildClassifierContents(
    history(input),
    { getTool: () => undefined },
    { toolName: "write_file", toolParams: { filePath: "forbidden.txt" } },
    true,
  )
  const text = JSON.stringify(contents)
  expect(text).toContain("Never change forbidden.txt")
  expect(text).toContain("Continue")
  for (const forbidden of ["ASSISTANT_OVERRIDE", "TOOL_OVERRIDE", "SYNTHETIC_OVERRIDE"])
    expect(text).not.toContain(forbidden)
})

test("a classifier outage never executes a tool; after repeated denials fallback requires a real ask", async () => {
  process.env.KILO_SCOPE_REVIEW = "on"
  await using tmp = await tmpdir()
  const input = proposal(tmp.path)
  expect(
    await evaluateProposal(input, async () => {
      throw new Error("offline")
    }),
  ).toMatchObject({ decision: "ask", unavailable: true })
  State.update(input.id, { consecutiveBlock: 3, consecutiveUnavailable: 0, totalBlock: 3, totalUnavailable: 0 })
  expect(
    await evaluateProposal(input, async () => {
      throw new Error("Must skip classifier at denial cap")
    }),
  ).toMatchObject({ decision: "ask", reasonCode: "consecutive_block" })
  State.clear(input.id)
})

test("projection or provider failures request approval and cannot run the actual wrapper tool", async () => {
  process.env.KILO_SCOPE_REVIEW = "on"
  await using tmp = await tmpdir()
  for (const projection of [true, false]) {
    let writes = 0
    let asks = 0
    const tools = wrap(
      {
        write: {
          inputSchema: jsonSchema({ type: "object" }),
          execute: async () => {
            writes++
            return "should not run"
          },
        },
      },
      {
        mode: "dos_llms_secure",
        id: crypto.randomUUID(),
        directory: tmp.path,
        model: ProviderTest.model(),
        rules: [],
        messages: [user("Do not modify forbidden.txt")],
        ask: async () => {
          asks++
          throw new Error("Manual decision unavailable")
        },
        query: async () => {
          throw new Error("Provider unavailable")
        },
      },
    )
    const args = {
      filePath: path.join(tmp.path, "forbidden.txt"),
      content: projection ? "x".repeat(32_001) : "changed",
    }
    await expect(
      Promise.resolve(
        tools.write.execute!(args, {
          toolCallId: "failing-call",
          messages: [],
          abortSignal: new AbortController().signal,
        }),
      ),
    ).rejects.toThrow("Manual decision unavailable")
    expect(asks).toBe(1)
    expect(writes).toBe(0)
  }
})

test("a later explicit permission reaches the classifier unchanged and may clear the prior restriction", async () => {
  process.env.KILO_SCOPE_REVIEW = "on"
  await using tmp = await tmpdir()
  const input = proposal(tmp.path, {
    messages: history([
      user("Do not modify forbidden.txt"),
      user("Now explicitly update forbidden.txt to fix the bug"),
    ]),
  })
  let observed = ""
  const result = await evaluateProposal(input, async (request) => {
    observed = JSON.stringify(request.contents)
    return { shouldBlock: false }
  })
  expect(result.decision).toBe("allow")
  expect(observed).toContain("Do not modify forbidden.txt")
  expect(observed).toContain("Now explicitly update forbidden.txt")
})

test("scope review does not turn a read outside the workspace into a write fallback", async () => {
  process.env.KILO_SCOPE_REVIEW = "on"
  await using tmp = await tmpdir()
  const result = await evaluateProposal(
    proposal(tmp.path, { name: "read", args: { filePath: path.join(tmp.path, "../outside.txt") } }),
    async () => {
      throw new Error("No model for safe reads")
    },
  )
  expect(result).toMatchObject({ decision: "allow", route: "fast-path:allowlist" })
})

test("shell scope projection preserves canonical workdir and refuses an unresolvable workdir", async () => {
  process.env.KILO_SCOPE_REVIEW = "on"
  await using tmp = await tmpdir()
  await fs.mkdir(path.join(tmp.path, "src"))
  await fs.symlink(path.join(tmp.path, "src"), path.join(tmp.path, "link"))
  const args = { command: "printf changed > ../forbidden.txt", workdir: "link" }
  expect(project("run_shell_command", args, tmp.path)).toEqual({
    command: args.command,
    cwd: path.join(tmp.path, "link"),
    canonical_cwd: path.join(tmp.path, "src"),
    workspace_root: tmp.path,
  })
  await fs.writeFile(path.join(tmp.path, "file"), "content")
  expect(
    await evaluateProposal(
      proposal(tmp.path, {
        name: "bash",
        args: { command: args.command, workdir: "file/child" },
      }),
      async () => {
        throw new Error("No classifier after projection failure")
      },
    ),
  ).toMatchObject({
    decision: "ask",
    reasonCode: "scope_projection_unavailable",
    unavailable: true,
  })
})
