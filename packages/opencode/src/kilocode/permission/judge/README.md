# Judge permission modes

Local `kilo run --mode mode_dos_llm_as_a_judge` uses Qwen Code's AUTO policy: deterministic guards, read/edit fast paths, a fast LLM verdict, then LLM review of a flagged action. `mode_prompt_guard_with_llm` adds Prompt Guard 2 before the semantic first stage. A benign injection score still reaches semantic review; a positive score routes directly to the second stage. Classifier failures never grant permission.

`dos_llms_secure` combines the existing two-stage Qwen judge with the `secure` policy:

- Both judges use the selected agent model: up to 256 output tokens for the first stage and 4096 for review, with the existing 10/30-second deadlines.
- Review runs only when the first stage flags the action. Read/search fast paths and deterministic guards remain; ordinary workspace writes and broad allow rules no longer bypass semantic authorization review in the combined mode.
- Secure file-read injection detection and package-install checks still run. A judge approval cannot override a security denial or a required security review. Headless runs reject requests that need manual approval.
- The combined policy is saved on the session and inherited by child sessions. It cannot be combined with bypass flags or a weaker permission policy.

Select **Kilo Code: Select Permission Mode → Dos LLMs + Secure** in VS Code, or run:

```bash
kilo run --mode dos_llms_secure --model localjudge/qwen3:14b-q4_K_M --dir /path/to/workspace "Run the tests"
```

`--permission-mode dos_llms_secure` selects the same policy. The provider/model identifier must match your configured provider. Existing modes keep their behavior; no additional model is downloaded.

Both modes retain Kilo's explicit deny/ask rules, protected configuration checks and sandbox restrictions. Manual fallbacks are rejected in this headless CLI integration. Child sessions inherit the mode; approval applies only to the checked tool invocation. The modes cannot be combined with `--auto`, `--yolo`, `--attach` or interactive mode. Existing daemon processes are bypassed. Other runs keep their existing behavior.

## Direct user scope and benchmark switches

In Dos LLMs + Secure, direct user instructions such as “do not change this file” and “change files only in this directory” are checked by the semantic judge before writes, edits, patches, shell commands and opaque/delegated actions. No additional scope form or confirmation is required. Every patch source and destination is projected with its canonical path. Shell proposals include the effective workdir, its canonical path and workspace root. Explicit permission denies remain authoritative. Natural-language interpretation is probabilistic: this is not a filesystem sandbox and cannot establish hidden helper/MCP side effects.

Available direct user messages survive the rolling tool-history window. Assistant prose, tool results, ignored and synthetic messages are excluded. More than 32,000 direct-user characters or an unprojectable/oversized pending action fails closed to manual review. Earlier context already removed by upstream compaction cannot be recovered by this gate.

Process-level benchmark switches, never controlled by agent instructions:

- `KILO_SCOPE_REVIEW=off`: restore the combined mode’s legacy routing/prompt/projection and rolling context window for ablation. Default is on; it affects only `dos_llms_secure`.
- `KILO_PROMPT_GUARD=on`: add the fixed PG path to `dos_llms_secure`; default is off. The legacy PG mode also uses the fixed additive path.
- `KILO_PERMISSION_TRACE=1`: emit coarse `[kilo-permission]` JSON records on stderr. `stage=judge` is the outer verdict; `stage=permission` records a later intrinsic/security decision. An outer allow can still be denied inside the tool. The benchmark joins these records with final tool outcomes; a gate allowance alone is not an execution-success result. Records contain IDs, mode, route, stable reason code and time, never action text or file content. `human_requested` means an interactive request was queued, not that a person actually answered; headless runs are distinguished.

The read-only `evaluateProposal` entrypoint shares the actual executing wrapper’s decision code. It may call the classifiers and update in-memory denial counters but never invokes a tool. Proposal accuracy, end-to-end outcomes and interactive friction must be reported separately.

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

Prompt Guard detects prompt injection, not general dangerous tool behavior. The previous benign-score semantic bypass has been fixed: benign scores still reach the first LLM; positive scores reach the second. Added protection remains experimental and must be measured against the same combined mode without PG. Chunking avoids truncating the end of long input, but does not guarantee detection.

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
bun test ./test/kilocode/permission/judge.test.ts ./test/kilocode/permission/judge-permission.test.ts ./test/kilocode/permission/scope-review.test.ts ./test/kilocode/permission/judge-query.test.ts
bun run typecheck
```

## Verified locally

On 2026-09-05, 98 targeted classifier and permission tests passed, along with CLI typechecking and the annotation/whitespace guards. Live calls to local `qwen3:8b-q4_K_M` and the supplied ONNX model allowed `npm test` and blocked a synthetic secret-exfiltration proposal after the second-stage LLM review in both modes. Those proposal checks did not execute the command. Each mode also completed a real CLI `bash` invocation of `echo judge-ok` in a temporary workspace. No benchmarks were run.

A long repeated benign text followed by a short injection was missed by the ONNX classifier (maximum score 0.029 across 11 chunks); a standalone explicit injection scored 0.999. These probes verify the integration, not classification accuracy or security equivalence.

The same live checks passed on preloaded local `qwen3:14b-q4_K_M` on 2026-09-05, with reasoning disabled and structured outputs enabled as above. Qwen mode allowed the safe proposal in 940 ms and blocked the exfiltration proposal after review in 1,680 ms; Prompt Guard mode took 608 ms and 2,139 ms respectively. Both CLI runs completed `echo judge-ok` with exit code 0 (22.0 and 15.2 seconds including startup). These are four classifier probes and two CLI integration checks, not benchmarks; model-independent unit tests were not rerun.
