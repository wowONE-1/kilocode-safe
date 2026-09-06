import { describe, expect, test } from "bun:test"
import { AppNodeBuilder } from "@opencode-ai/core/effect/app-node-builder"
import * as CrossSpawnSpawner from "@opencode-ai/core/cross-spawn-spawner"
import { Effect, Fiber, Layer } from "effect"
import * as Config from "@/config/config"
import { Permission } from "@/permission"
import { SessionID } from "@/session/schema"
import { testEffect } from "../../lib/effect"
import * as PermissionMode from "../../../src/kilocode/permission/mode"

const env = Layer.mergeAll(
  AppNodeBuilder.build(Permission.node),
  AppNodeBuilder.build(Config.node),
  AppNodeBuilder.build(CrossSpawnSpawner.node),
)
const it = testEffect(env)

describe("permission mode", () => {
  test("uses the last session mode and excludes it from tool permissions", () => {
    const rules = [
      { permission: "bash", pattern: "git *", action: "allow" as const },
      PermissionMode.rule("vanilla"),
      PermissionMode.rule("ask"),
    ]

    expect(PermissionMode.resolve(rules)).toBe("ask")
    expect(PermissionMode.without(rules)).toEqual([{ permission: "bash", pattern: "git *", action: "allow" }])
  })

  test("inherits the mode from a parent session", async () => {
    const mode = await PermissionMode.inherited(
      { id: "child", parentID: "parent" },
      async (id) => (id === "parent" ? { id, permission: [PermissionMode.rule("vanilla")] } : undefined),
    )

    expect(mode).toBe("vanilla")
  })

  test("marks only secure and ask modes as security-checked", () => {
    expect(PermissionMode.isSecure("secure")).toBe(true)
    expect(PermissionMode.isSecure("ask")).toBe(true)
    expect(PermissionMode.isSecure(undefined)).toBe(true)
    expect(PermissionMode.isSecure("auto")).toBe(false)
    expect(PermissionMode.isSecure("vanilla")).toBe(false)
  })
})

it.instance(
  "auto mode approves ordinary asks but not a security review",
  () =>
    Effect.gen(function* () {
      const permission = yield* Permission.Service
      const input = {
        sessionID: SessionID.make("ses_mode_auto"),
        permission: "bash",
        patterns: ["git status"],
        always: [],
        ruleset: [{ permission: "bash", pattern: "*", action: "ask" as const }],
      }

      const approved = yield* permission.ask({
        ...input,
        metadata: PermissionMode.withMetadata("auto", {}),
      })
      expect(approved).toMatchObject({ manual: false, rule: { action: "allow" } })

      const fiber = yield* permission
        .ask({
          ...input,
          metadata: PermissionMode.withMetadata("auto", { securityReview: true }),
        })
        .pipe(Effect.forkScoped)
      const pending = yield* Effect.gen(function* () {
        while (true) {
          const items = yield* permission.list()
          if (items.length > 0) return items
          yield* Effect.sleep("10 millis")
        }
      }).pipe(Effect.timeoutOrElse({ duration: "1 second", orElse: () => Effect.fail(new Error("timed out")) }))
      expect(pending).toHaveLength(1)
      const request = pending.at(0)
      if (!request) throw new Error("Expected a pending permission")
      yield* permission.reply({ requestID: request.id, reply: "reject" })
      yield* Fiber.await(fiber)
    }),
  { git: true },
)

it.instance(
  "ask mode prompts even when the normal permission rule allows the action",
  () =>
    Effect.gen(function* () {
      const permission = yield* Permission.Service
      const fiber = yield* permission
        .ask({
          sessionID: SessionID.make("ses_mode_ask"),
          permission: "bash",
          patterns: ["git status"],
          always: [],
          metadata: PermissionMode.withMetadata("ask", {}),
          ruleset: [{ permission: "bash", pattern: "*", action: "allow" }],
        })
        .pipe(Effect.forkScoped)
      const pending = yield* Effect.gen(function* () {
        while (true) {
          const items = yield* permission.list()
          if (items.length > 0) return items
          yield* Effect.sleep("10 millis")
        }
      }).pipe(Effect.timeoutOrElse({ duration: "1 second", orElse: () => Effect.fail(new Error("timed out")) }))
      expect(pending).toHaveLength(1)
      const request = pending.at(0)
      if (!request) throw new Error("Expected a pending permission")
      yield* permission.reply({ requestID: request.id, reply: "once" })
      expect((yield* Fiber.join(fiber)).manual).toBe(true)
    }),
  { git: true },
)
