// regression test for bash permission metadata.command
import { AppNodeBuilder } from "@opencode-ai/core/effect/app-node-builder"
import { describe, expect, test } from "bun:test"
import { Effect, Exit, Layer, ManagedRuntime } from "effect"
import { ShellTool } from "../../src/tool/shell"
import { provideTestInstance } from "../fixture/fixture"
import { tmpdir } from "../fixture/fixture"
import { Shell } from "@opencode-ai/core/shell"
import { SessionID, MessageID } from "../../src/session/schema"
import type { Permission } from "../../src/permission"
import { Agent } from "../../src/agent/agent"
import { Truncate } from "../../src/tool/truncate"
import * as CrossSpawnSpawner from "@opencode-ai/core/cross-spawn-spawner"
import { FSUtil } from "@opencode-ai/core/fs-util"
import { Plugin } from "../../src/plugin"
import { Config } from "../../src/config/config"
import { RuntimeFlags } from "../../src/effect/runtime-flags"

const runtime = ManagedRuntime.make(
  Layer.mergeAll(
    AppNodeBuilder.build(CrossSpawnSpawner.node),
    AppNodeBuilder.build(FSUtil.node),
    AppNodeBuilder.build(Plugin.node),
    AppNodeBuilder.build(Truncate.node),
    AppNodeBuilder.build(Agent.node),
    AppNodeBuilder.build(Config.node),
    RuntimeFlags.layer(),
  ),
)

Shell.acceptable.reset()

const baseCtx = {
  sessionID: SessionID.make("ses_test"),
  messageID: MessageID.make("msg_test"),
  callID: "",
  agent: "code",
  abort: AbortSignal.any([]),
  messages: [],
  metadata: () => Effect.void,
  ask: () => Effect.void,
}

const capture = (requests: Array<Omit<Permission.Request, "id" | "sessionID" | "tool">>) => ({
  ...baseCtx,
  ask: (req: Omit<Permission.Request, "id" | "sessionID" | "tool">) =>
    Effect.sync(() => {
      requests.push(req)
    }),
})

const review = (requests: Array<Omit<Permission.Request, "id" | "sessionID" | "tool">>) => ({
  ...baseCtx,
  ask: (req: Omit<Permission.Request, "id" | "sessionID" | "tool">) =>
    Effect.gen(function* () {
      requests.push(req)
      if (req.permission === "security_package") {
        return yield* Effect.die(new Error("security review required"))
      }
    }),
})

describe("bash permission metadata.command", () => {
  test("asks for security review before executing an unverified package source", async () => {
    await using tmp = await tmpdir()
    await provideTestInstance({
      directory: tmp.path,
      fn: async () => {
        const bash = await runtime.runPromise(ShellTool.pipe(Effect.flatMap((info) => info.init())))
        const requests: Array<Omit<Permission.Request, "id" | "sessionID" | "tool">> = []
        const exit = await Effect.runPromiseExit(bash.execute({ command: "bun add file:./reactt" }, review(requests)))

        expect(Exit.isFailure(exit)).toBe(true)
        expect(requests).toHaveLength(1)
        expect(requests[0]).toMatchObject({
          permission: "security_package",
          patterns: ["bun add file:./reactt"],
          always: [],
          metadata: {
            command: "bun add file:./reactt",
            packages: ["file:./reactt"],
            securityReview: true,
          },
        })
      },
    })
  })

  test("uses the package review as the only prompt for a direct install", async () => {
    await using tmp = await tmpdir()
    await provideTestInstance({
      directory: tmp.path,
      fn: async () => {
        const bash = await runtime.runPromise(ShellTool.pipe(Effect.flatMap((info) => info.init())))
        const requests: Array<Omit<Permission.Request, "id" | "sessionID" | "tool">> = []
        await Effect.runPromise(bash.execute({ command: "bun add file:./package" }, capture(requests)))

        expect(requests).toHaveLength(1)
        expect(requests[0]).toMatchObject({ permission: "security_package" })
      },
    })
  })

  test("permission prompt shows raw command without tool name prefix", async () => {
    await using tmp = await tmpdir()
    await provideTestInstance({
      directory: tmp.path,
      fn: async () => {
        const bash = await runtime.runPromise(ShellTool.pipe(Effect.flatMap((info) => info.init())))
        const requests: Array<Omit<Permission.Request, "id" | "sessionID" | "tool">> = []
        const command = "echo hello"
        await Effect.runPromise(bash.execute({ command, description: "Echo hello" }, capture(requests)))

        const bashReq = requests.find((r) => r.permission === "bash")
        expect(bashReq).toBeDefined()
        expect(bashReq!.metadata.command).toBe(command)
      },
    })
  })

  test.skipIf(process.platform === "win32").each([
    ["single quoted", "cat << 'EOF'\n$HOME\nEOF"],
    ["double quoted", 'cat << "EOF"\n$HOME\nEOF'],
    ["escaped", "cat << \\EOF\n$HOME\nEOF"],
    ["unquoted", "cat << EOF\n$HOME\nEOF"],
  ] as const)("marks %s heredocs", async (_, command) => {
    await using tmp = await tmpdir()
    await provideTestInstance({
      directory: tmp.path,
      fn: async () => {
        const bash = await runtime.runPromise(ShellTool.pipe(Effect.flatMap((info) => info.init())))
        const requests: Array<Omit<Permission.Request, "id" | "sessionID" | "tool">> = []
        await Effect.runPromise(bash.execute({ command }, capture(requests)))

        const req = requests.find((item) => item.permission === "bash")
        expect(req?.metadata.heredoc).toBe(true)
        expect(req?.metadata.command).toBe(command)
        expect(req?.patterns).toEqual([command])
        expect(req?.always).toEqual(["cat *"])
      },
    })
  })

  test("omits heredoc metadata for ordinary commands", async () => {
    await using tmp = await tmpdir()
    await provideTestInstance({
      directory: tmp.path,
      fn: async () => {
        const bash = await runtime.runPromise(ShellTool.pipe(Effect.flatMap((info) => info.init())))
        const requests: Array<Omit<Permission.Request, "id" | "sessionID" | "tool">> = []
        await Effect.runPromise(bash.execute({ command: "echo hello" }, capture(requests)))

        const req = requests.find((item) => item.permission === "bash")
        expect(req?.metadata.heredoc).toBeUndefined()
      },
    })
  })
})
