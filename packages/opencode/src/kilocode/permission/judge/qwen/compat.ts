export interface Part {
  text?: string
  functionCall?: { name?: string; args?: Record<string, unknown> }
  functionResponse?: unknown
}
export interface Content {
  role?: string
  parts?: Part[]
}
export interface ToolRegistry {
  getTool(
    name: string,
  ): { toAutoClassifierInput(args: Record<string, unknown>): Record<string, unknown> | string } | undefined
}
export type PermissionDeniedReason = "classifier_unavailable" | "classifier_blocked"
export type ToolCallConfirmationDetails = { type: string; [key: string]: unknown }
export interface PermissionCheckContext {
  toolName: string
  filePath?: string
  command?: string
  cwd?: string
}
