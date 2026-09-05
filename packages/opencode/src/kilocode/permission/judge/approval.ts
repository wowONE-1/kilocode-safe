import { AsyncLocalStorage } from "node:async_hooks"

// Approval is scoped to one checked tool invocation, never a session-wide allow rule.
export const approval = new AsyncLocalStorage<{ session: string; call: string }>()
