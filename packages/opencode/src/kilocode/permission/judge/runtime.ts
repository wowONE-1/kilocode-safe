import fs from "node:fs"
import path from "node:path"
import type { Tool as AITool, ToolExecutionOptions } from "ai"
import type { Provider } from "@/provider/provider"
import type { MessageV2 } from "@/session/message-v2"
import { Permission } from "@/permission"
import type { Config } from "./qwen/config/config"
import type { Content, Part, ToolRegistry } from "./qwen/compat"
import { evaluateAutoMode, applyAutoModeDecision, shouldForceAutoModeReviewForAllow } from "./qwen/permissions/autoMode"
import { shouldFallback, recordFallbackApprove } from "./qwen/permissions/denialTracking"
import { approval } from "./approval"
import { query } from "./query"
import * as State from "./state"

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

export function project(name: string, args: Record<string, unknown>): Record<string, unknown> {
  if (name === "run_shell_command") return { command: args.command }
  if (name === "edit") {
    const old = String(args.oldString ?? args.old_string ?? "")
    const text = String(args.newString ?? args.new_string ?? "")
    return {
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
  },
) {
  if (!input.mode) return tools
  const mode = input.mode
  const registry: ToolRegistry = { getTool: (name) => ({ toAutoClassifierInput: (args) => project(name, args) }) }
  const config: Config = {
    getAutoModeSettings: () => ({}),
    getToolRegistry: () => registry,
    getWorkspaceContext: () => ({ isPathWithinWorkspace: (file) => within(input.directory, file) }),
    getModel: () => `${input.model.providerID}/${input.model.id}`,
    getFastModel: () => `${input.model.providerID}/${input.model.id}`,
    setAutoModeDenialState: (value) => State.update(input.id, value),
    query: (request) => query(mode, input.model, request),
  }
  for (const [name, tool] of Object.entries(tools)) {
    const execute = tool.execute
    if (!execute) continue
    tool.execute = async (args, options) => {
      const params = args as Record<string, unknown>
      const file = typeof params.filePath === "string" ? path.resolve(input.directory, params.filePath) : undefined
      const command = typeof params.command === "string" ? params.command : undefined
      const rule = Permission.evaluate(
        name === "write" ? "edit" : name,
        file ?? command ?? "*",
        input.rules,
      ) as Permission.Rule & { source?: string }
      if (rule.action === "deny") throw new Error(`Tool denied by permission rule: ${name}`)
      const ctx = {
        toolName: canonical(name),
        filePath: file,
        command,
        cwd: typeof params.workdir === "string" ? path.resolve(input.directory, params.workdir) : input.directory,
      }
      if (
        rule.action === "allow" &&
        rule.source != null &&
        rule.source !== "agent" &&
        !shouldForceAutoModeReviewForAllow(ctx, input.directory)
      ) {
        return execute(args, options)
      }
      const fallback = shouldFallback(State.state(input.id))
      const decision = await evaluateAutoMode({
        ctx,
        toolParams: params,
        messages: history(input.messages),
        config,
        pmForcedAsk: rule.action === "ask" && rule.source != null && rule.source !== "agent",
        signal: options.abortSignal ?? new AbortController().signal,
        skipClassifierReason: fallback.fallback ? fallback.reason : undefined,
      })
      const outcome = applyAutoModeDecision(decision, config, State.state(input.id))
      if (outcome.kind === "blocked") throw new Error(outcome.errorMessage)
      if (outcome.kind === "fallback") {
        await input.ask(name, params, options, outcome.message ?? outcome.reason)
        State.update(input.id, recordFallbackApprove(State.state(input.id)))
      }
      return approval.run({ session: input.id, call: options.toolCallId }, () => execute(args, options))
    }
  }
  return tools
}
