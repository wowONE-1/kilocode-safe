import { createHash } from "node:crypto"
import * as Mode from "../mode"
import * as State from "./state"

export interface Decision {
  stage: "judge" | "permission"
  mode?: Mode.Value | State.Mode
  session_id: string
  call_id?: string
  tool: string
  permission?: string
  route: string
  decision: "allow" | "deny" | "ask"
  reason_code: string
  duration_ms: number
  human_requested: boolean
  scope_review?: boolean
  prompt_guard?: boolean
}

// Tool identifiers for external MCPs may contain arbitrary user content.
const names = new Set([
  "bash",
  "edit",
  "write",
  "apply_patch",
  "read",
  "grep",
  "glob",
  "list",
  "task",
  "webfetch",
  "websearch",
  "question",
  "todowrite",
  "security_package",
  "security_prompt_injection",
  "external_directory",
  "sandbox_escalation",
])
function name(value: string) {
  return names.has(value) ? value : "other:" + createHash("sha256").update(value).digest("hex").slice(0, 12)
}

export function emit(input: Decision) {
  if (process.env.KILO_PERMISSION_TRACE !== "1") return
  console.error(
    "[kilo-permission] " +
      JSON.stringify({
        schema_version: 1,
        event: "permission_decision",
        ...input,
        mode: Mode.valid(input.mode) || State.modes.includes(input.mode as State.Mode) ? input.mode : undefined,
        tool: name(input.tool),
        ...(input.permission ? { permission: name(input.permission) } : {}),
      }),
  )
}

export function begin(input: {
  sessionID: string
  permission: string
  tool?: { callID: string }
  metadata?: Record<string, unknown>
}) {
  const start = performance.now()
  return (decision: Decision["decision"], route: string, reason: string, human = false) =>
    emit({
      stage: "permission",
      mode: Mode.fromMetadata(input.metadata),
      session_id: input.sessionID,
      call_id: input.tool?.callID,
      tool: input.permission,
      permission: input.permission,
      route,
      decision,
      reason_code: reason,
      duration_ms: performance.now() - start,
      human_requested: human,
      scope_review: input.metadata?.kiloPermissionMode === "dos_llms_secure" && process.env.KILO_SCOPE_REVIEW !== "off",
      prompt_guard: input.metadata?.kiloPermissionMode === "dos_llms_secure" && process.env.KILO_PROMPT_GUARD === "on",
    })
}
