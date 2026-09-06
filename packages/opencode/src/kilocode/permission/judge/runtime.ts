import fs from "node:fs"
import path from "node:path"
import type { Tool as AITool, ToolExecutionOptions } from "ai"
import type { Provider } from "@/provider/provider"
import type { MessageV2 } from "@/session/message-v2"
import { Permission } from "@/permission"
import { Patch } from "@/patch"
import type { Config } from "./qwen/config/config"
import type { Content, Part, ToolRegistry } from "./qwen/compat"
import {
  evaluateAutoMode,
  applyAutoModeDecision,
  shouldForceAutoModeReviewForAllow,
  isInSafeToolAllowlist,
} from "./qwen/permissions/autoMode"
import { shouldFallback, recordFallbackApprove } from "./qwen/permissions/denialTracking"
import { approval } from "./approval"
import { query } from "./query"
import * as State from "./state"
import * as Scope from "./scope"
import * as Audit from "./telemetry"

const names: Record<string, string> = {
  bash: "run_shell_command",
  read: "read_file",
  write: "write_file",
  grep: "grep_search",
  todowrite: "todo_write",
  question: "ask_user_question",
  task: "agent",
  webfetch: "web_fetch",
  websearch: "web_search",
}

export function canonical(name: string) {
  return names[name] ?? name
}

export function project(name: string, args: Record<string, unknown>, directory?: string): Record<string, unknown> {
  const paths = directory ? targets(name, args, directory) : []
  const scoped = directory && paths.length ? { targets: paths } : {}
  if (directory && name === "apply_patch") {
    const patch = typeof args.patchText === "string" ? args.patchText : ""
    return { ...scoped, patch_preview: patch.slice(0, 3000), patch_truncated: patch.length > 3000 }
  }
  if (name === "run_shell_command") {
    if (!directory) return { command: args.command }
    const cwd = typeof args.workdir === "string" ? path.resolve(directory, args.workdir) : directory
    return { command: args.command, cwd, canonical_cwd: real(cwd), workspace_root: real(directory) }
  }
  if (name === "edit") {
    const old = String(args.oldString ?? args.old_string ?? "")
    const text = String(args.newString ?? args.new_string ?? "")
    return {
      ...scoped,
      file_path: args.filePath ?? args.file_path,
      old_string_preview: old.slice(0, 300),
      new_string_preview: text.slice(0, 300),
      old_string_truncated: old.length > 300,
      new_string_truncated: text.length > 300,
      lines_changed: (text.match(/\n/g)?.length ?? 0) - (old.match(/\n/g)?.length ?? 0),
    }
  }
  if (name === "write_file") {
    const text = String(args.content ?? "")
    return {
      ...scoped,
      file_path: args.filePath ?? args.file_path,
      byte_count: Buffer.byteLength(text),
      content_preview: text.slice(0, 300),
      content_truncated: text.length > 300,
    }
  }
  return args
}

export function history(messages: MessageV2.WithParts[]): Content[] {
  return messages.map((message) => ({
    role: message.info.role === "assistant" ? "model" : "user",
    parts: message.parts.flatMap<Part>((part) => {
      if (message.info.role === "user" && part.type === "text" && !part.synthetic && !part.ignored)
        return [{ text: part.text }]
      if (message.info.role === "assistant" && part.type === "tool")
        return [{ functionCall: { name: canonical(part.tool), args: part.state.input } }]
      return []
    }),
  }))
}

// Resolve the nearest existing ancestor as well as symlinks for new files.
export function real(file: string): string {
  try {
    return fs.realpathSync(file)
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error
    const parent = path.dirname(file)
    if (parent === file) throw error
    return path.join(real(parent), path.basename(file))
  }
}

export function within(root: string, file: string) {
  const relative = path.relative(real(root), real(path.resolve(root, file)))
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative))
}

// Canonical paths are evidence for the model; this is not an OS write boundary.
export function targets(name: string, args: Record<string, unknown>, directory: string) {
  const item = (value: string, operation: string) => {
    if (!value || value.includes("\0")) throw new Error("Invalid action path")
    const absolute = path.resolve(directory, value)
    return { path: value, absolute_path: absolute, canonical_path: real(absolute), operation }
  }
  const paths =
    name === "apply_patch"
      ? (() => {
          if (typeof args.patchText !== "string") throw new Error("Patch text is required for scope review")
          const hunks = Patch.parsePatch(args.patchText).hunks
          if (!hunks.length) throw new Error("Patch has no target paths")
          return hunks.flatMap((hunk) => [
            item(hunk.path, hunk.type),
            ...(hunk.type === "update" && hunk.move_path ? [item(hunk.move_path, "move_destination")] : []),
          ])
        })()
      : typeof (args.filePath ?? args.file_path) === "string"
        ? [item(String(args.filePath ?? args.file_path), name)]
        : []
  if (paths.length > 200 || JSON.stringify(paths).length > 16_000) throw new Error("Action target budget exceeded")
  return paths
}

export interface Proposal {
  mode: State.Mode
  id: string
  directory: string
  model: Provider.Model
  name: string
  args: Record<string, unknown>
  // Callers must supply direct user text and bare prior calls only. The wrapper
  // applies history() at the Kilo message boundary before entering this function.
  messages: Content[]
  rules: Permission.Ruleset
  signal: AbortSignal
}

export interface Verdict {
  decision: "allow" | "deny" | "ask"
  route: string
  reason: string
  reasonCode: string
  durationMs: number
  grant: boolean
  unavailable: boolean
}

// Shared by the executing wrapper and read-only benchmark proposals. This
// function can call classifiers and update denial counters, but never tools.
export async function evaluateProposal(input: Proposal, provider?: Config["query"]): Promise<Verdict> {
  const start = performance.now()
  const scoped = Scope.enabled(input.mode)
  const name = canonical(input.name)
  const forced = scoped && !isInSafeToolAllowlist(name)
  const finish = (value: Omit<Verdict, "durationMs" | "unavailable">): Verdict => ({
    ...value,
    unavailable: value.reasonCode === "classifier_unavailable" || value.reasonCode === "scope_projection_unavailable",
    durationMs: performance.now() - start,
  })
  const file = typeof input.args.filePath === "string" ? path.resolve(input.directory, input.args.filePath) : undefined
  const command = typeof input.args.command === "string" ? input.args.command : undefined
  const permission = input.name === "write" || (scoped && input.name === "apply_patch") ? "edit" : input.name
  const rule = Permission.evaluate(permission, file ?? command ?? "*", input.rules) as Permission.Rule & {
    source?: string
  }
  if (rule.action === "deny")
    return finish({
      decision: "deny",
      route: "rule",
      reason: "Tool denied by explicit permission rule",
      reasonCode: "rule_deny",
      grant: false,
    })
  const ctx = {
    toolName: name,
    filePath: file,
    command,
    cwd: typeof input.args.workdir === "string" ? path.resolve(input.directory, input.args.workdir) : input.directory,
  }
  let paths: ReturnType<typeof targets> = []
  if (scoped) {
    try {
      if (JSON.stringify(input.args).length > Scope.MAX_ACTION_CHARS)
        throw new Error("Action exceeds scope review budget")
      paths = targets(name, input.args, input.directory)
      project(name, input.args, input.directory)
    } catch {
      return finish({
        decision: "ask",
        route: "fallback",
        reason:
          "The action paths or payload cannot be safely projected for scope review. Use a smaller, explicit action.",
        reasonCode: "scope_projection_unavailable",
        grant: false,
      })
    }
    // A multi-file patch and symlink must not hide a target-specific rule.
    for (const target of paths) {
      for (const value of new Set([
        target.path,
        target.absolute_path,
        target.canonical_path,
        path.relative(input.directory, target.absolute_path),
        path.relative(input.directory, target.canonical_path),
      ])) {
        if (Permission.evaluate(permission, value, input.rules).action === "deny") {
          return finish({
            decision: "deny",
            route: "rule",
            reason: "An action target is denied by an explicit permission rule",
            reasonCode: "rule_deny",
            grant: false,
          })
        }
      }
    }
  }
  if (
    rule.action === "allow" &&
    rule.source != null &&
    rule.source !== "agent" &&
    !forced &&
    !shouldForceAutoModeReviewForAllow(ctx, input.directory)
  ) {
    return finish({ decision: "allow", route: "rule", reason: "", reasonCode: "rule_allow", grant: false })
  }
  const registry: ToolRegistry = {
    getTool: (name) => ({ toAutoClassifierInput: (args) => project(name, args, scoped ? input.directory : undefined) }),
  }
  const config: Config = {
    getAutoModeSettings: () => ({ scopeReview: scoped }),
    getToolRegistry: () => registry,
    getWorkspaceContext: () => ({ isPathWithinWorkspace: (file) => within(input.directory, file) }),
    getModel: () => `${input.model.providerID}/${input.model.id}`,
    getFastModel: () => `${input.model.providerID}/${input.model.id}`,
    setAutoModeDenialState: (value) => State.update(input.id, value),
    query: provider ?? ((request) => query(input.mode, input.model, request)),
  }
  const asks =
    scoped &&
    paths.some((target) =>
      [
        target.path,
        target.absolute_path,
        target.canonical_path,
        path.relative(input.directory, target.absolute_path),
        path.relative(input.directory, target.canonical_path),
      ].some((value) => {
        const next = Permission.evaluate(permission, value, input.rules) as Permission.Rule & { source?: string }
        return next.action === "ask" && next.source != null && next.source !== "agent"
      }),
    )
  if (forced && paths.some((target) => !within(input.directory, target.canonical_path))) {
    return finish({
      decision: "ask",
      route: "fallback",
      reason: "Writes outside the workspace require manual approval.",
      reasonCode: "external_write",
      grant: false,
    })
  }
  const fallback = shouldFallback(State.state(input.id))
  const decision = await evaluateAutoMode({
    ctx,
    toolParams: input.args,
    messages: input.messages,
    config,
    pmForcedAsk: asks || (rule.action === "ask" && rule.source != null && rule.source !== "agent"),
    signal: input.signal,
    skipClassifierReason: fallback.fallback ? fallback.reason : undefined,
  })
  const outcome = applyAutoModeDecision(decision, config, State.state(input.id))
  return finish({
    decision: outcome.kind === "approved" ? "allow" : outcome.kind === "blocked" ? "deny" : "ask",
    route: decision.via === "classifier" ? `classifier:${decision.stage}` : decision.via,
    reason:
      outcome.kind === "blocked"
        ? outcome.errorMessage
        : outcome.kind === "fallback"
          ? (outcome.message ?? outcome.reason)
          : "",
    reasonCode: outcome.kind === "approved" ? "approved" : outcome.reason,
    grant: outcome.kind === "approved",
  })
}

export function wrap(
  tools: Record<string, AITool>,
  input: {
    mode?: State.Mode
    id: string
    directory: string
    model: Provider.Model
    messages: MessageV2.WithParts[]
    rules: Permission.Ruleset
    ask: (name: string, args: Record<string, unknown>, options: ToolExecutionOptions, reason: string) => Promise<void>
    query?: Config["query"]
  },
) {
  for (const [name, tool] of Object.entries(tools)) {
    const execute = tool.execute
    if (!execute) continue
    tool.execute = async (args, options) => {
      const params = args as Record<string, unknown>
      if (!input.mode) return execute(args, options)
      const mode = input.mode
      const verdict = await evaluateProposal(
        {
          mode,
          id: input.id,
          directory: input.directory,
          model: input.model,
          name,
          args: params,
          messages: history(input.messages),
          rules: input.rules,
          signal: options.abortSignal ?? new AbortController().signal,
        },
        input.query,
      )
      Audit.emit({
        stage: "judge",
        mode,
        session_id: input.id,
        call_id: options.toolCallId,
        tool: name,
        route: verdict.route,
        decision: verdict.decision,
        reason_code: verdict.reasonCode,
        duration_ms: verdict.durationMs,
        human_requested: false,
        scope_review: Scope.enabled(mode),
        prompt_guard: Scope.guarded(mode),
      })
      if (verdict.decision === "deny") throw new Error(verdict.reason)
      if (verdict.decision === "ask") {
        await input.ask(name, params, options, verdict.reason)
        State.update(input.id, recordFallbackApprove(State.state(input.id)))
      }
      if (!verdict.grant && verdict.decision !== "ask") return execute(args, options)
      return approval.run({ session: input.id, call: options.toolCallId }, () => execute(args, options))
    }
  }
  return tools
}
