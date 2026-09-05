import { generateObject, jsonSchema } from "ai"
import { mergeDeep } from "remeda"
import { Provider } from "@/provider/provider"
import { ProviderTransform } from "@/provider/transform"
import { AppRuntime } from "@/effect/app-runtime"
import type { Query } from "./qwen/config/config"
import { guard } from "./guard"
import type { Mode } from "./state"
import z from "zod"

const fast = z.object({ shouldBlock: z.boolean() }).strict()
const review = z.object({ thinking: z.string(), shouldBlock: z.boolean(), reason: z.string() }).strict()

export async function query(mode: Mode, model: Provider.Model, input: Query) {
  const text = input.contents.map((message) => message.parts?.map((part) => part.text ?? "").join("\n")).join("\n\n")
  if (mode === "mode_prompt_guard_with_llm" && input.purpose === "permission_classifier_stage1") {
    return guard(text, input.abortSignal)
  }
  const language = await AppRuntime.runPromise(Provider.Service.use((svc) => svc.getLanguage(model)))
  const result = await generateObject({
    model: language,
    schema: jsonSchema(input.schema),
    system: input.systemInstruction,
    prompt: text,
    temperature: model.capabilities.temperature ? input.config.temperature : undefined,
    maxOutputTokens: input.config.maxOutputTokens,
    maxRetries: input.maxAttempts - 1,
    abortSignal: input.abortSignal,
    providerOptions: ProviderTransform.providerOptions(
      model,
      mergeDeep(model.options, model.variants?.none ?? ProviderTransform.smallOptions(model)),
    ),
  })
  return (input.purpose === "permission_classifier_stage1" ? fast : review).parse(result.object)
}
