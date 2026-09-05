import type { Content, ToolRegistry } from "../compat"
import type { AutoModeDenialState } from "../permissions/denialTracking"
export enum ApprovalMode {
  AUTO = "auto",
}
export interface Settings {
  classifyAllShell?: boolean
  hints?: { allow?: string[]; deny?: string[]; softDeny?: string[]; hardDeny?: string[] }
  environment?: string[]
  classifier?: { timeouts?: { stage1Ms?: number; stage2Ms?: number }; thinking?: { stage2Enabled?: boolean } }
}
export interface Query {
  contents: Content[]
  schema: Record<string, unknown>
  systemInstruction: string
  abortSignal: AbortSignal
  purpose: string
  skipOutputLanguagePreference: boolean
  maxAttempts: number
  config: { temperature: number; maxOutputTokens: number; thinkingConfig: { includeThoughts: boolean } }
}
export interface Config {
  getAutoModeSettings(): Settings
  getToolRegistry(): ToolRegistry
  getWorkspaceContext(): { isPathWithinWorkspace(path: string): boolean }
  setAutoModeDenialState(state: AutoModeDenialState): void
  getFastModel(): string
  getModel(): string
  query(input: Query): Promise<unknown>
}
