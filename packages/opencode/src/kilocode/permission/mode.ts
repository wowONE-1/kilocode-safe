import type { PermissionV1 } from "@opencode-ai/core/v1/permission"

export const values = ["auto", "vanilla", "secure", "ask"] as const
export type Value = (typeof values)[number]

const permission = "kilo_permission_mode"
const metadata = "kiloPermissionMode"

export function valid(value: unknown): value is Value {
  return typeof value === "string" && (values as readonly string[]).includes(value)
}

export function rule(value: Value): PermissionV1.Rule {
  return { permission, pattern: value, action: "allow" }
}

export function configured(rules: PermissionV1.Ruleset | undefined): Value | undefined {
  const item = rules?.findLast((item) => item.permission === permission && item.action === "allow" && valid(item.pattern))
  return item && valid(item.pattern) ? item.pattern : undefined
}

export function resolve(rules: PermissionV1.Ruleset | undefined): Value {
  return configured(rules) ?? "secure"
}

export async function inherited(
  input: { id: string; parentID?: string; permission?: PermissionV1.Ruleset },
  parent: (id: string) => Promise<{ id: string; parentID?: string; permission?: PermissionV1.Ruleset } | undefined>,
): Promise<Value> {
  const seen = new Set<string>()
  let current: { id: string; parentID?: string; permission?: PermissionV1.Ruleset } | undefined = input
  while (current && !seen.has(current.id)) {
    seen.add(current.id)
    const value = configured(current.permission)
    if (value) return value
    current = current.parentID ? await parent(current.parentID) : undefined
  }
  return "secure"
}

export function without(rules: PermissionV1.Ruleset): PermissionV1.Ruleset {
  return rules.filter((item) => item.permission !== permission)
}

export function fromMetadata(value: Record<string, unknown> | undefined): Value {
  return valid(value?.[metadata]) ? value[metadata] : "secure"
}

export function isSecure(value: unknown): boolean {
  return value === undefined || value === "secure" || value === "ask"
}

export function withMetadata(value: Value, data: Record<string, unknown> | undefined) {
  return { ...data, [metadata]: value }
}
