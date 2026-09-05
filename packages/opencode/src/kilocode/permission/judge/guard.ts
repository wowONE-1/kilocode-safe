import z from "zod"

export const MODEL = "meta-llama/Llama-Prompt-Guard-2-86M"
const verdict = z
  .object({ model: z.literal(MODEL), score: z.number().min(0).max(1), chunks: z.number().int().positive() })
  .strict()

export async function guard(text: string, signal: AbortSignal) {
  const key = process.env.KILO_PROMPT_GUARD_API_KEY
  const response = await fetch(process.env.KILO_PROMPT_GUARD_URL ?? "http://127.0.0.1:8765/classify", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(key ? { Authorization: `Bearer ${key}` } : {}) },
    body: JSON.stringify({ text }),
    signal,
    redirect: "error",
  })
  if (!response.ok) throw new Error(`Prompt Guard unavailable: HTTP ${response.status}`)
  const result = verdict.parse(await response.json())
  return { shouldBlock: result.score >= 0.5 }
}
