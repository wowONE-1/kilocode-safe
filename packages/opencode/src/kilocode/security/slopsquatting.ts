const installers = [
  {
    registry: "npm" as const,
    pattern: /(?:^|&&|\|\||;)\s*(?:npm|pnpm|yarn|bun)\s+(?:add|install|i)(?:\s+([^;&|]+))?/g,
  },
  {
    registry: "pypi" as const,
    pattern: /(?:^|&&|\|\||;)\s*(?:(?:python|python3)\s+-m\s+)?pip(?:3)?\s+install(?:\s+([^;&|]+))?/g,
  },
  {
    registry: "pypi" as const,
    pattern: /(?:^|&&|\|\||;)\s+uv\s+(?:add|pip\s+install)(?:\s+([^;&|]+))?/g,
  },
]

const values = new Set([
  "-c",
  "-r",
  "--cache",
  "--constraint",
  "--extra-index-url",
  "--find-links",
  "--index-url",
  "--prefix",
  "--python",
  "--registry",
  "--requirement",
  "--tag",
  "--trusted-host",
  "--userconfig",
])
const npmName = /^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/i
const pypiName = /^[a-z0-9][a-z0-9._-]*$/i
const exact = /^\d+(?:\.\d+){0,2}(?:[-+][0-9a-z.-]+)?$/i
const custom = /(?:--registry|--index-url|--extra-index-url|--find-links)\b/
const popular = [
  "axios",
  "django",
  "eslint",
  "express",
  "fastapi",
  "flask",
  "lodash",
  "next",
  "numpy",
  "pandas",
  "prettier",
  "pytest",
  "react",
  "react-dom",
  "requests",
  "torch",
  "typescript",
  "vite",
  "webpack",
  "zod",
]
const week = 7 * 24 * 60 * 60 * 1000
const month = 30 * 24 * 60 * 60 * 1000

type Registry = "npm" | "pypi" | "unknown"
type Verdict = "allow" | "ask" | "deny"

type PackageInfo = {
  registry: Registry
  name: string
  spec: string
  version?: string
}

type ReviewInfo = PackageInfo & {
  verdict: Verdict
  reasons: string[]
}

type Fetch = (input: string, init?: RequestInit) => Promise<Response>

type Options = {
  fetch?: Fetch
  now?: number
}

function record(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return
  return value as Record<string, unknown>
}

function string(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : undefined
}

function items(value: string) {
  const tokens = value
    .trim()
    .split(/\s+/)
    .map((item) => item.replace(/[;,]$/, ""))
    .filter((item) => item.length > 0)
  return tokens.reduce(
    (state, item) => {
      if (state.skip) return { list: state.list, skip: false }
      if (values.has(item)) return { list: state.list, skip: true }
      if (item.startsWith("-")) return state
      return { list: [...state.list, item], skip: false }
    },
    { list: [] as string[], skip: false },
  ).list
}

function external(value: string) {
  return (
    value.startsWith(".") ||
    value.startsWith("/") ||
    value.includes("://") ||
    value.startsWith("file:") ||
    value.startsWith("git+") ||
    value.startsWith("github:")
  )
}

function npm(value: string): PackageInfo {
  if (external(value)) return { registry: "unknown", name: value, spec: value }
  const scoped = value.startsWith("@")
  const index = scoped ? value.indexOf("@", value.indexOf("/") + 1) : value.indexOf("@")
  const name = index > 0 ? value.slice(0, index) : value
  const version = index > 0 ? value.slice(index + 1) : undefined
  if (!npmName.test(name) || version?.includes(":")) return { registry: "unknown", name: value, spec: value }
  return { registry: "npm", name, spec: value, version }
}

function pypi(value: string): PackageInfo {
  if (external(value)) return { registry: "unknown", name: value, spec: value }
  const match = value.match(/^([a-z0-9][a-z0-9._-]*)(?:\[[^\]]+\])?(.*)$/i)
  const name = match?.at(1)
  if (!name || !pypiName.test(name)) return { registry: "unknown", name: value, spec: value }
  const tail = match?.at(2) ?? ""
  const version = tail.match(/^==\s*([^;\s]+)/)?.at(1)
  if (tail.length > 0 && !version) return { registry: "pypi", name, spec: value, version: "*" }
  return { registry: "pypi", name, spec: value, version }
}

function date(value: unknown) {
  const parsed = Date.parse(string(value) ?? "")
  return Number.isNaN(parsed) ? undefined : parsed
}

function recent(value: unknown, now: number, limit = week) {
  const parsed = date(value)
  if (parsed === undefined) return
  return now - parsed < limit
}

function distance(left: string, right: string) {
  const start = Array.from({ length: right.length + 1 }, (_, index) => index)
  return (
    Array.from(left).reduce(
      (previous, token, row) =>
        Array.from(right).reduce(
          (current, item, column) => [
            ...current,
            Math.min(
              (current.at(-1) ?? 0) + 1,
              (previous.at(column + 1) ?? 0) + 1,
              (previous.at(column) ?? 0) + (token === item ? 0 : 1),
            ),
          ],
          [row + 1],
        ),
      start,
    ).at(-1) ?? 0
  )
}

function similar(value: string) {
  const name = value.replaceAll(/[^a-z0-9]/gi, "").toLowerCase()
  return popular.find((item) => distance(name, item.replaceAll(/[^a-z0-9]/gi, "").toLowerCase()) === 1)
}

function review(input: PackageInfo, verdict: Verdict, reasons: string[]): ReviewInfo {
  return { ...input, verdict, reasons }
}

async function body(url: string, fetcher: Fetch) {
  try {
    const response = await fetcher(url, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(3_000),
    })
    if (response.status === 404) return { status: "missing" as const }
    if (!response.ok) return { status: "unavailable" as const }
    return { status: "ok" as const, value: await response.json() }
  } catch {
    return { status: "unavailable" as const }
  }
}

function scripts(value: unknown) {
  const data = record(value)
  const names = ["preinstall", "install", "postinstall"]
  return names.some((name) => typeof data?.[name] === "string")
}

async function checkNpm(input: PackageInfo, options: Required<Options>): Promise<ReviewInfo> {
  if (input.version && input.version !== "latest" && !exact.test(input.version)) {
    return review(input, "ask", ["non-exact-version"])
  }
  const data = await body("https://registry.npmjs.org/" + encodeURIComponent(input.name), options.fetch)
  if (data.status === "missing") {
    return input.name.startsWith("@")
      ? review(input, "ask", ["package-not-found-or-private"])
      : review(input, "deny", ["package-not-found"])
  }
  if (data.status === "unavailable") return review(input, "ask", ["registry-unavailable"])
  const meta = record(data.value)
  const tags = record(meta?.["dist-tags"])
  const versions = record(meta?.versions)
  const version = input.version && input.version !== "latest" ? input.version : string(tags?.latest)
  const item = record(version ? versions?.[version] : undefined)
  if (!meta || !version || !item) return review(input, "deny", ["invalid-registry-metadata"])
  const near = similar(input.name)

  const reasons = [
    ...(recent(record(meta.time)?.[version], options.now) ? ["recent-release"] : []),
    ...(recent(record(meta.time)?.created, options.now, month) ? ["recent-package"] : []),
    ...(Object.keys(versions ?? {}).length < 2 ? ["single-version"] : []),
    ...(scripts(item.scripts) ? ["lifecycle-script"] : []),
    ...(string(record(item.dist)?.integrity) ? [] : ["missing-integrity"]),
    ...(string(item.deprecated) ? ["deprecated"] : []),
    ...(near ? ["similar-to-" + near] : []),
  ]
  return review(input, reasons.length > 0 ? "ask" : "allow", reasons)
}

async function checkPypi(input: PackageInfo, options: Required<Options>): Promise<ReviewInfo> {
  if (input.version === "*") return review(input, "ask", ["non-exact-version"])
  const data = await body("https://pypi.org/pypi/" + encodeURIComponent(input.name) + "/json", options.fetch)
  if (data.status === "missing") return review(input, "deny", ["package-not-found"])
  if (data.status === "unavailable") return review(input, "ask", ["registry-unavailable"])
  const meta = record(data.value)
  const info = record(meta?.info)
  const releases = record(meta?.releases)
  const version = input.version ?? string(info?.version)
  const files =
    version && Array.isArray(releases?.[version])
      ? releases[version].map(record).filter((item): item is Record<string, unknown> => item !== undefined)
      : []
  if (!meta || !version || files.length === 0) return review(input, "deny", ["invalid-registry-metadata"])
  if (files.some((item) => item?.yanked === true)) return review(input, "deny", ["yanked-release"])

  const uploaded = files.map((item) => item?.upload_time_iso_8601).find((item) => date(item) !== undefined)
  const near = similar(input.name)
  const reasons = [
    ...(recent(uploaded, options.now) ? ["recent-release"] : []),
    ...(uploaded ? [] : ["missing-release-date"]),
    ...(Object.keys(releases ?? {}).length < 2 ? ["single-version"] : []),
    ...(files.some((item) => string(record(item.digests)?.sha256)) ? [] : ["missing-integrity"]),
    ...(near ? ["similar-to-" + near] : []),
  ]
  return review(input, reasons.length > 0 ? "ask" : "allow", reasons)
}

export namespace Slopsquatting {
  export type Package = PackageInfo
  export type Review = ReviewInfo

  export function packages(command: string): PackageInfo[] {
    if (custom.test(command)) {
      return [{ registry: "unknown", name: "custom-registry-dependencies", spec: "custom-registry-dependencies" }]
    }
    return installers
      .flatMap((installer) =>
        Array.from(command.matchAll(installer.pattern)).flatMap((match) => {
          const args = items(match.at(1) ?? "")
          if (args.length === 0) {
            return [{ registry: "unknown" as const, name: "declared-dependencies", spec: "declared-dependencies" }]
          }
          return args.map((item) => (installer.registry === "npm" ? npm(item) : pypi(item)))
        }),
      )
      .filter((item, index, list) => list.findIndex((value) => value.spec === item.spec) === index)
  }

  export async function inspect(command: string, options: Options = {}): Promise<ReviewInfo[]> {
    const input = packages(command)
    const opts = { fetch: options.fetch ?? globalThis.fetch, now: options.now ?? Date.now() }
    return Promise.all(
      input.map((item) => {
        if (item.registry === "npm") return checkNpm(item, opts)
        if (item.registry === "pypi") return checkPypi(item, opts)
        return review(item, "ask", ["unsupported-package-source"])
      }),
    )
  }
}
