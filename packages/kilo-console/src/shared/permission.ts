import type { PermissionRuleset } from "@kilocode/sdk/v2/client"

export const modes = [
  { value: "auto", label: "Auto" },
  { value: "vanilla", label: "Vanilla Kilo" },
  { value: "secure", label: "Secure" },
  { value: "ask", label: "Ask" },
  { value: "dos_llms_secure", label: "Dos LLMs + Secure" },
] as const

export type PermissionMode = (typeof modes)[number]["value"]

export function configured(rules: PermissionRuleset | undefined): PermissionMode {
  const rule = rules?.findLast(
    (rule) =>
      rule.permission === "kilo_permission_mode" &&
      rule.action === "allow" &&
      modes.some((mode) => mode.value === rule.pattern),
  )
  return modes.find((mode) => mode.value === rule?.pattern)?.value ?? "secure"
}

export function permission(mode: PermissionMode): PermissionRuleset {
  return [{ permission: "kilo_permission_mode", pattern: mode, action: "allow" }]
}
