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
