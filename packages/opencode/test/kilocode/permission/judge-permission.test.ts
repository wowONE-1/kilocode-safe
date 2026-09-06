import { expect } from "bun:test"
import { AppNodeBuilder } from "@opencode-ai/core/effect/app-node-builder"
import { CrossSpawnSpawner } from "@opencode-ai/core/cross-spawn-spawner"
import { Effect, Layer } from "effect"
import { Config } from "@/config/config"
import { RuntimeFlags } from "@/effect/runtime-flags"
import { EffectBridge } from "@/effect/bridge"
import { EventV2Bridge } from "@/event-v2-bridge"
import { InstanceBootstrap } from "@/project/bootstrap-service"
import { InstanceStore } from "@/project/instance-store"
import { Permission } from "@/permission"
import { MessageID, SessionID } from "@/session/schema"
import { approval } from "@/kilocode/permission/judge/approval"
import { wrap } from "@/kilocode/permission/judge/runtime"
import * as Mode from "@/kilocode/permission/mode"
import { ProviderTest } from "../../fake/provider"
import { TestInstance } from "../../fixture/fixture"
import { jsonSchema } from "ai"
import { testEffect } from "../../lib/effect"

const env = Layer.mergeAll(
  AppNodeBuilder.build(Permission.node),
  AppNodeBuilder.build(EventV2Bridge.node),
  AppNodeBuilder.build(CrossSpawnSpawner.node),
  AppNodeBuilder.build(InstanceStore.node, [
    [
      InstanceStore.bootstrapNode,
      Layer.succeed(InstanceBootstrap.Service, InstanceBootstrap.Service.of({ run: Effect.void })),
    ],
  ]),
).pipe(Layer.provide(RuntimeFlags.layer()), Layer.provide(AppNodeBuilder.build(Config.node)))
const it = testEffect(Layer.mergeAll(env, RuntimeFlags.layer()))

it.instance(
  "judge approval survives the real Effect bridge and stays scoped to its call",
  () =>
    Effect.gen(function* () {
      const permission = yield* Permission.Service
      const run = yield* EffectBridge.make()
      const session = SessionID.make("session_judge")
      const request = {
        sessionID: session,
        permission: "bash",
        patterns: ["echo ok"],
        always: [],
        metadata: {},
        tool: { messageID: MessageID.make("msg_judge"), callID: "call_judge" },
        ruleset: [{ permission: "bash", pattern: "*", action: "ask" as const }],
      }
      const result = yield* Effect.promise(() =>
        approval.run({ session, call: "call_judge" }, () => run.promise(permission.ask(request))),
      )
      expect(result.manual).toBe(false)
      expect(result.rule?.action).toBe("allow")
      // A hard denial must still fail even inside the approved invocation.
      const denied = yield* Effect.promise(() =>
        approval.run({ session, call: "call_judge" }, () =>
          run.promise(
            permission
              .ask({ ...request, ruleset: [{ permission: "bash", pattern: "*", action: "deny" }] })
              .pipe(Effect.exit),
          ),
        ),
      )
      expect(denied._tag).toBe("Failure")
      for (const variant of [
        { ...request, tool: { ...request.tool, callID: "different" } },
        { ...request, metadata: { securityReview: true } },
        { ...request, metadata: Mode.withMetadata("dos_llms_secure", { securityReview: true }) },
        { ...request, ruleset: [{ permission: "bash", pattern: "*", action: "ask" as const, source: "project" }] },
      ]) {
        const pending = yield* Effect.promise(() =>
          approval.run({ session, call: "call_judge" }, async () => {
            const result = run.promise(permission.ask(variant).pipe(Effect.exit))
            for (let attempt = 0; attempt < 100; attempt++) {
              const requests = await run.promise(permission.list())
              if (requests.length) {
                await run.promise(permission.reply({ requestID: requests[0].id, reply: "reject" }))
                return result
              }
              await Bun.sleep(10)
            }
            throw new Error("Expected a pending permission, not an inherited approval")
          }),
        )
        expect(pending._tag).toBe("Failure")
      }
    }),
  { git: true },
)

it.instance(
  "dos_llms_secure fast-path approval cannot bypass a secure denial",
  () =>
    Effect.gen(function* () {
      const permission = yield* Permission.Service
      const run = yield* EffectBridge.make()
      const fixture = yield* TestInstance
      const session = SessionID.make("session_combined")
      const rules = [{ permission: "read", pattern: "*", action: "ask" as const }]
      const execute = (deny: boolean) => {
        const tools = wrap(
          {
            read: {
              inputSchema: jsonSchema({ type: "object" }),
              execute: async (_args, options) => {
                const result = await run.promise(
                  permission.ask({
                    sessionID: session,
                    permission: "read",
                    patterns: ["README.md"],
                    always: [],
                    metadata: Mode.withMetadata(
                      "dos_llms_secure",
                      deny ? { securityDeny: true, securityReview: true } : {},
                    ),
                    tool: { messageID: MessageID.make("msg_combined"), callID: options.toolCallId },
                    ruleset: rules,
                  }),
                )
                return result.manual ? "manual" : "allowed"
              },
            },
          },
          {
            mode: "dos_llms_secure",
            id: session,
            directory: fixture.directory,
            model: ProviderTest.model(),
            messages: [],
            rules,
            ask: async () => {
              throw new Error("unexpected classifier fallback")
            },
          },
        )
        return tools.read.execute!(
          {},
          { toolCallId: "call_combined", messages: [], abortSignal: new AbortController().signal },
        )
      }
      expect(yield* Effect.promise(() => Promise.resolve(execute(false)))).toBe("allowed")
      yield* Effect.promise(async () => {
        await expect(Promise.resolve(execute(true))).rejects.toThrow()
      })
      expect(yield* permission.list()).toHaveLength(0)
    }),
  { git: true },
)

it.instance(
  "audit exposes a later security veto without logging payloads",
  () =>
    Effect.gen(function* () {
      const permission = yield* Permission.Service
      const run = yield* EffectBridge.make()
      const fixture = yield* TestInstance
      const session = SessionID.make("session_audit")
      const rows: Array<Record<string, unknown>> = []
      const previous = process.env.KILO_PERMISSION_TRACE
      const output = console.error
      process.env.KILO_PERMISSION_TRACE = "1"
      console.error = (value?: unknown) => {
        if (typeof value === "string" && value.startsWith("[kilo-permission] ")) rows.push(JSON.parse(value.slice(18)))
      }
      try {
        const tools = wrap(
          {
            read: {
              inputSchema: jsonSchema({ type: "object" }),
              execute: async (_args, options) =>
                run.promise(
                  permission.ask({
                    sessionID: session,
                    permission: "security_package",
                    patterns: ["SENSITIVE_PAYLOAD"],
                    always: [],
                    metadata: Mode.withMetadata("dos_llms_secure", {
                      securityDeny: true,
                      securityReview: true,
                      securityReason: "SENSITIVE_REASON",
                    }),
                    tool: { messageID: MessageID.make("msg_audit"), callID: options.toolCallId },
                    ruleset: [],
                  }),
                ),
            },
          },
          {
            mode: "dos_llms_secure",
            id: session,
            directory: fixture.directory,
            model: ProviderTest.model(),
            messages: [],
            rules: [],
            ask: async () => {
              throw new Error("No classifier fallback expected")
            },
          },
        )
        yield* Effect.promise(async () => {
          await expect(
            Promise.resolve(
              tools.read.execute!(
                {},
                { toolCallId: "call_audit", messages: [], abortSignal: new AbortController().signal },
              ),
            ),
          ).rejects.toThrow()
        })
        expect(rows).toHaveLength(2)
        expect(rows[0]).toMatchObject({
          stage: "judge",
          mode: "dos_llms_secure",
          decision: "allow",
          call_id: "call_audit",
        })
        expect(rows[1]).toMatchObject({
          stage: "permission",
          mode: "dos_llms_secure",
          decision: "deny",
          route: "security",
          call_id: "call_audit",
          human_requested: false,
        })
        expect(JSON.stringify(rows)).not.toContain("SENSITIVE_PAYLOAD")
        expect(JSON.stringify(rows)).not.toContain("SENSITIVE_REASON")
      } finally {
        console.error = output
        if (previous === undefined) delete process.env.KILO_PERMISSION_TRACE
        else process.env.KILO_PERMISSION_TRACE = previous
      }
    }),
  { git: true },
)
