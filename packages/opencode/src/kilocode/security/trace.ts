import { Slopsquatting } from "./slopsquatting"

const prompts = [
  ["ignore-previous-instructions", /\b(?:ignore|disregard)\b[\s\S]{0,120}\b(?:previous|prior)\b[\s\S]{0,120}\binstructions?\b/i],
  ["role-override", /\b(?:system prompt|developer message|you are now)\b/i],
  ["secret-exfiltration", /\b(?:send|upload|exfiltrate)\b[\s\S]{0,120}\b(?:secret|token|password|\.env)\b/i],
] as const

function enabled() {
  return process.env.KILO_SECURITY_TRACE === "1"
}

function print(event: string, data: Record<string, unknown>) {
  if (!enabled()) return
  console.log(`[kilo-security] ${event}`, data)
}

function names(command: string) {
  return Slopsquatting.packages(command).map((item) => item.name)
}

export namespace SecurityTrace {
  export function command(input: { command: string; cwd: string; patterns: readonly string[] }) {
    const packages = names(input.command)
    console.error("🔥 SECURITY TRACE SLOPSQUATTING:", JSON.stringify({ ...input, packages }))
    print("slopsquatting candidate", { ...input, packages })
    return packages
  }

  export function file(input: { path: string; text: string }) {
    const signals = prompts.filter((item) => item[1].test(input.text)).map((item) => item[0])
    console.error("🔥 SECURITY TRACE PROMPT INJECTION:", JSON.stringify({ ...input, signals }))
    print("prompt-injection candidate", { ...input, signals })
    return signals
  }
}
