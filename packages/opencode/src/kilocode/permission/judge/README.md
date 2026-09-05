# Judge permission modes

Local `kilo run --mode mode_dos_llm_as_a_judge` uses Qwen Code's AUTO policy: deterministic guards, read/edit fast paths, a fast LLM verdict, then LLM review of a flagged action. `mode_prompt_guard_with_llm` replaces only that first classifier call with Prompt Guard 2. A benign first-stage result skips review. Classifier failures never grant permission.

Both modes retain Kilo's explicit deny/ask rules, protected configuration checks and sandbox restrictions. Manual fallbacks are rejected in this headless CLI integration. Child sessions inherit the mode; approval applies only to the checked tool invocation. The modes cannot be combined with `--auto`, `--yolo`, `--attach` or interactive mode. Existing daemon processes are bypassed. Other runs keep their existing behavior.

## Local setup

From this directory:

```powershell
python -m pip install -r requirements.txt
python prompt_guard.py --model C:\path\to\model.quant.onnx
```

Place the matching `tokenizer.json` and `config.json` alongside the ONNX file. The server verifies the model identity and binary label mapping (BENIGN=0, MALICIOUS=1). It listens on loopback port 8765. Override the client address with `KILO_PROMPT_GUARD_URL` if needed. It uses 512-token chunks with 128-token overlap and the maximum malicious probability, threshold 0.5. Weights are not included.

The local check used the supplied 281,297,931-byte ONNX file and tokenizer from `gravitee-io/Llama-Prompt-Guard-2-86M-onnx` revision `45a05fbd5337a864edc608f994911f009c37ca57`. This is a community ONNX conversion, not an independently verified weight-equivalent export.

For the local Ollama OpenAI-compatible provider, use these provider/model settings in your Kilo configuration:

```json
{
  "provider": {
    "localjudge": {
      "npm": "@ai-sdk/openai-compatible",
      "options": {
        "baseURL": "http://localhost:11434/v1",
        "apiKey": "local",
        "supportsStructuredOutputs": true
      },
      "models": {
        "qwen3:8b-q4_K_M": {
          "name": "Qwen local",
          "tool_call": true,
          "options": { "reasoningEffort": "none" },
          "limit": { "context": 32768, "output": 8192 }
        }
      }
    }
  }
}
```

`think: false` does not disable reasoning on Ollama's `/v1/chat/completions`; use `reasoningEffort: "none"`. Structured output support must be enabled so the JSON schema reaches Ollama. The judge uses the selected agent model and its `none` variant when available. Choose a model/provider configuration that supports non-thinking structured responses; the original Qwen deadlines (10/30 seconds) and output limits (256/4096 tokens) are retained.

From the repository root, using that configuration:

```powershell
bun dev -- run --mode mode_dos_llm_as_a_judge --model localjudge/qwen3:8b-q4_K_M --dir C:\path\to\workspace "Run the tests"
bun dev -- run --mode mode_prompt_guard_with_llm --model localjudge/qwen3:8b-q4_K_M --dir C:\path\to\workspace "Run the tests"
```

Prompt Guard detects prompt injection, not general dangerous tool behavior. Its benign verdict can therefore bypass the second LLM for actions that the original Qwen classifier would flag. This mode is experimental; deterministic guards remain, but it is not security-equivalent to the first mode. Chunking avoids truncating the end of long input, but does not guarantee detection.

## Shared temporary endpoint

The shared endpoint uses the existing Ollama VPS tunnel. Set these environment variables before starting Kilo (Docker benchmark runs read them from `vibesechack/.env`):

```dotenv
KILO_PROMPT_GUARD_URL=https://ollama.free-spanish-learning.ru/prompt-guard/classify
KILO_PROMPT_GUARD_API_KEY=<separate Prompt Guard token>
```

The client sends the token as a Bearer authorization header and does not follow redirects. Missing/invalid authorization and endpoint failures never grant permission. Keep tokens out of version control. Local use can omit the token and keep the default loopback URL. Already-running terminals need the new environment variables explicitly or must be restarted.

On the host PC, `C:\Users\dimka\.ollama-remote\start.ps1` starts Ollama and the scheduled task `Ollama VPS Tunnel`, which starts Prompt Guard and forwards both services. `stop.ps1` stops both services and their tunnel. The PC must stay awake. No automatic expiration is configured.

## Source and adaptations

`qwen/permissions/{autoMode,classifier,classifier-transcript,denialTracking,destructive-commands,shell-semantics}.ts`, classifier prompts, context-length detection and tool names are copied from local Qwen Code revision `80497a74d0e807f4640b60f7fe482bb97202408a`, under Apache-2.0 (see `qwen/LICENSE`). The transitive shell utility and compound-command splitter declarations are extracted unchanged from that revision. Original headers and policy implementations are preserved.

Kilo adapters replace the Qwen runtime/config/SDK/logger interfaces and map Kilo tool arguments and session history. The existing Kilo model provider executes side queries; Qwen's separate provider/auth stack is not copied. Kilo instruction/config paths are added to the protected-path lists. This ports the full AUTO decision pipeline, not Qwen's CLI or unrelated settings/hooks. Qwen AUTO settings use their defaults. Explicit Kilo permission rules remain authoritative.

Targeted checks (from `packages/opencode`):

```powershell
bun test ./test/kilocode/permission/judge.test.ts ./test/kilocode/permission/judge-permission.test.ts
bun run typecheck
```

## Verified locally

On 2026-09-05, 98 targeted classifier and permission tests passed, along with CLI typechecking and the annotation/whitespace guards. Live calls to local `qwen3:8b-q4_K_M` and the supplied ONNX model allowed `npm test` and blocked a synthetic secret-exfiltration proposal after the second-stage LLM review in both modes. Those proposal checks did not execute the command. Each mode also completed a real CLI `bash` invocation of `echo judge-ok` in a temporary workspace. No benchmarks were run.

A long repeated benign text followed by a short injection was missed by the ONNX classifier (maximum score 0.029 across 11 chunks); a standalone explicit injection scored 0.999. These probes verify the integration, not classification accuracy or security equivalence.

The same live checks passed on preloaded local `qwen3:14b-q4_K_M` on 2026-09-05, with reasoning disabled and structured outputs enabled as above. Qwen mode allowed the safe proposal in 940 ms and blocked the exfiltration proposal after review in 1,680 ms; Prompt Guard mode took 608 ms and 2,139 ms respectively. Both CLI runs completed `echo judge-ok` with exit code 0 (22.0 and 15.2 seconds including startup). These are four classifier probes and two CLI integration checks, not benchmarks; model-independent unit tests were not rerun.
