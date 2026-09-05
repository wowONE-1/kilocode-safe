import { createDenialState } from "./qwen/permissions/denialTracking"

export const modes = ["mode_dos_llm_as_a_judge", "mode_prompt_guard_with_llm"] as const
export type Mode = (typeof modes)[number]
const roots = new Map<string, Mode>()
const states = new Map<string, ReturnType<typeof createDenialState>>()
const owners = new Map<string, string>()

export function register(id: string, mode: Mode) {
  roots.set(id, mode)
}
export function clear(id: string) {
  roots.delete(id)
  states.delete(id)
  for (const [child, root] of owners) {
    if (root !== id) continue
    states.delete(child)
    owners.delete(child)
  }
}
export function state(id: string) {
  return states.get(id) ?? createDenialState()
}
export function update(id: string, value: ReturnType<typeof createDenialState>) {
  states.set(id, value)
}
export async function resolve(
  id: string,
  parent: (id: string) => Promise<string | undefined>,
): Promise<Mode | undefined> {
  if (!roots.size) return
  const child = id
  const seen = new Set<string>()
  while (!seen.has(id)) {
    seen.add(id)
    const mode = roots.get(id)
    if (mode) {
      owners.set(child, id)
      return mode
    }
    const next = await parent(id)
    if (!next) return
    id = next
  }
  throw new Error("Cyclic session ancestry")
}
