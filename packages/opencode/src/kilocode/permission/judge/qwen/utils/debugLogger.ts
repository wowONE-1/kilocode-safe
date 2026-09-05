import * as Log from "@opencode-ai/core/util/log"
export function createDebugLogger(tag: string) {
  return Log.create({ service: `qwen-auto-${tag}` })
}
