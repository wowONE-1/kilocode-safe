import * as vscode from "vscode"
import type { Event, KiloClient } from "@kilocode/sdk/v2/client"
import type { KiloConnectionService } from "../services/cli-backend/connection-service"

/**
 * Callback that resolves the correct working directory for a session.
 * For worktree sessions this returns the worktree path; otherwise the workspace root.
 */
export type DirectoryResolver = (sessionId?: string) => string

/**
 * Returns every unique directory the extension tracks
 * (workspace root + all registered worktree paths).
 */
export type AllDirectories = () => string[]
type Asked = Extract<Event, { type: "permission.asked" }>
export const permissionModes = ["auto", "vanilla", "secure", "ask", "dos_llms_secure"] as const
export type PermissionMode = (typeof permissionModes)[number]

export interface AutoApproveController {
  active(): boolean
  mode(): PermissionMode
  approve(event: Asked, directory?: string): Promise<boolean>
  toggle(): Promise<boolean>
  apply(sessionID: string, directory: string): Promise<void>
  onChange(listener: (active: boolean) => void): { dispose(): void }
}

const CONFIG = "kilo-code.new.autoApprove"
const KEY = "enabled"
const MODE_CONFIG = "kilo-code.new.permissionMode"
const MODE_KEY = "default"

/**
 * Runtime auto-accept toggle for permissions.
 *
 * Instead of writing to the CLI config, the attention coordinator delegates
 * `permission.asked` events here and auto-replies "once". This avoids config-layer
 * issues (merged vs global, sparse defaults) and works even when the sidebar is closed.
 */
export function registerToggleAutoApprove(
  context: vscode.ExtensionContext,
  connectionService: KiloConnectionService,
  resolve: DirectoryResolver,
  directories: AllDirectories,
): AutoApproveController {
  let mode = readMode()
  // Bumped on disable to invalidate in-flight enable drains
  let generation = 0
  const listeners = new Set<(active: boolean) => void>()

  const notify = () => {
    for (const listener of listeners) listener(mode === "auto")
  }

  const setMode = async (next: PermissionMode) => {
    mode = next
    generation++
    notify()
    await vscode.workspace.getConfiguration(MODE_CONFIG).update(MODE_KEY, mode, target(MODE_CONFIG, MODE_KEY))
    return mode
  }

  const toggle = async () => {
    await setMode(mode === "auto" ? "secure" : "auto")
    const snapshot = generation

    if (mode !== "auto") {
      vscode.window.showInformationMessage("Auto-approve disabled")
      return false
    }

    vscode.window.showInformationMessage("Auto-approve enabled")
    // Drain any already-pending permission requests across all tracked directories
    const client = tryGetClient(connectionService)
    if (!client) return true
    for (const dir of directories()) {
      if (generation !== snapshot) break
      try {
        const { data: pending } = await client.permission.list({ directory: dir }, { throwOnError: true })
        for (const req of pending) {
          if (generation !== snapshot) break
          if (sensitive(req.metadata)) continue
          await client.permission
            .reply({ requestID: req.id, directory: dir, reply: "once" }, { throwOnError: true })
            .catch((err) => {
              console.error("[Kilo New] toggleAutoApprove: failed to drain pending:", err)
            })
        }
      } catch (err) {
        console.error("[Kilo New] toggleAutoApprove: failed to list pending permissions:", err)
      }
    }

    return true
  }

  const approve = async (event: Asked, directory?: string) => {
    if (mode !== "auto") return false
    const client = tryGetClient(connectionService)
    if (!client) return false
    if (sensitive(event.properties.metadata)) return false
    const dir =
      directory ?? connectionService.getPermissionDirectory(event.properties.id) ?? resolve(event.properties.sessionID)
    return client.permission
      .reply({ requestID: event.properties.id, directory: dir, reply: "once" }, { throwOnError: true })
      .then(
        () => true,
        (err) => {
          console.error("[Kilo New] toggleAutoApprove: failed to auto-reply:", err)
          return false
        },
      )
  }

  const apply = async (sessionID: string, directory: string) => {
    const client = tryGetClient(connectionService)
    if (!client) return
    try {
      const current = await client.session.get({ sessionID, directory }, { throwOnError: true })
      if (currentMode(current.data?.permission) === mode) return
      await client.session.update(
        {
          sessionID,
          directory,
          permission: [{ permission: "kilo_permission_mode", pattern: mode, action: "allow" }],
        },
        { throwOnError: true },
      )
    } catch (err) {
      console.error("[Kilo New] permission mode: failed to apply:", err)
    }
  }

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((event) => {
      const hasMode = configuredMode() !== undefined
      if (
        !event.affectsConfiguration(`${MODE_CONFIG}.${MODE_KEY}`) &&
        (hasMode || !event.affectsConfiguration(`${CONFIG}.${KEY}`))
      )
        return
      const next = readMode()
      if (next === mode) return
      mode = next
      generation++
      notify()
    }),
  )

  context.subscriptions.push(vscode.commands.registerCommand("kilo-code.new.toggleAutoApprove", toggle))
  context.subscriptions.push(
    vscode.commands.registerCommand("kilo-code.new.selectPermissionMode", async () => {
      const selected = await vscode.window.showQuickPick(
        [
          {
            label: "Auto",
            detail: "Approve ordinary requests automatically without custom security checks",
            mode: "auto",
          },
          {
            label: "Vanilla Kilo",
            detail: "Use normal Kilo permissions without custom security checks",
            mode: "vanilla",
          },
          {
            label: "Secure",
            detail: "Use Kilo permissions plus prompt-injection and slopsquatting checks",
            mode: "secure",
          },
          {
            label: "Dos LLMs + Secure",
            detail: "Use two-stage LLM review (256 / 4096 tokens) plus security checks",
            mode: "dos_llms_secure",
          },
          { label: "Ask", detail: "Ask at each permission boundary, with security checks", mode: "ask" },
        ] satisfies Array<{ label: string; detail: string; mode: PermissionMode }>,
        { placeHolder: "Select Kilo permission mode" },
      )
      if (!selected) return
      await setMode(selected.mode)
      vscode.window.showInformationMessage(`Kilo permission mode: ${selected.label}`)
    }),
  )

  return {
    active: () => mode === "auto",
    mode: () => mode,
    approve,
    toggle,
    apply,
    onChange(listener) {
      listeners.add(listener)
      let disposed = false
      return {
        dispose() {
          if (disposed) return
          disposed = true
          listeners.delete(listener)
        },
      }
    },
  }
}

function sensitive(metadata: Record<string, unknown> | undefined) {
  return ["sandboxEscalation", "securityReview", "configProtected", "judgeFallback", "securityDeny", "skillShell"].some(
    (key) => metadata?.[key] === true,
  )
}

function readActive(): boolean {
  return vscode.workspace.getConfiguration(CONFIG).get(KEY, false)
}

function readMode(): PermissionMode {
  const value = configuredMode()
  if (permissionModes.includes(value as PermissionMode)) return value as PermissionMode
  return readActive() ? "auto" : "secure"
}

function configuredMode(): unknown {
  const info = vscode.workspace.getConfiguration(MODE_CONFIG).inspect<unknown>(MODE_KEY)
  return info?.workspaceFolderValue ?? info?.workspaceValue ?? info?.globalValue
}

function currentMode(
  rules: ReadonlyArray<{ permission: string; pattern: string; action: string }> | undefined,
): PermissionMode | undefined {
  const value = rules?.findLast(
    (item) =>
      item.permission === "kilo_permission_mode" &&
      item.action === "allow" &&
      permissionModes.includes(item.pattern as PermissionMode),
  )?.pattern
  return permissionModes.includes(value as PermissionMode) ? (value as PermissionMode) : undefined
}

function target(config: string, key: string): vscode.ConfigurationTarget {
  const info = vscode.workspace.getConfiguration(config).inspect<unknown>(key)
  if (info?.workspaceFolderValue !== undefined) return vscode.ConfigurationTarget.WorkspaceFolder
  if (info?.workspaceValue !== undefined) return vscode.ConfigurationTarget.Workspace
  return vscode.ConfigurationTarget.Global
}

function tryGetClient(connectionService: KiloConnectionService): KiloClient | undefined {
  try {
    return connectionService.getClient()
  } catch {
    return undefined
  }
}
