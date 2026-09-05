// Qwen defaults plus Kilo instruction files at the host boundary.
export const LOCAL_CONTEXT_FILENAME = "QWEN.local.md"
export function getAllMemoryFilenames() {
  return ["QWEN.md", "AGENTS.md", "CLAUDE.md", ".kilocoderules"]
}
