import { describe, expect, test } from "bun:test"
import { Slopsquatting } from "../../../src/kilocode/security/slopsquatting"

const now = Date.parse("2026-09-04T00:00:00.000Z")

function fetch(value: unknown, status = 200) {
  return async () => new Response(status === 404 ? undefined : JSON.stringify(value), { status })
}

describe("slopsquatting", () => {
  test("allows a stable npm package with complete metadata", async () => {
    const review = (await Slopsquatting.inspect("npm install react@1.0.0", {
      now,
      fetch: fetch({
        "dist-tags": { latest: "1.0.0" },
        time: {
          created: "2020-01-01T00:00:00.000Z",
          "0.9.0": "2024-01-01T00:00:00.000Z",
          "1.0.0": "2025-01-01T00:00:00.000Z",
        },
        versions: {
          "0.9.0": { dist: { integrity: "sha512-previous" } },
          "1.0.0": {
            dist: { integrity: "sha512-stable" },
          },
        },
      }),
    })).at(0)

    expect(review).toMatchObject({ name: "react", registry: "npm", verdict: "allow", reasons: [] })
  })

  test("asks about an npm package with a lifecycle script", async () => {
    const review = (await Slopsquatting.inspect("npm install build-tool", {
      now,
      fetch: fetch({
        "dist-tags": { latest: "1.0.0" },
        time: {
          created: "2020-01-01T00:00:00.000Z",
          "0.9.0": "2024-01-01T00:00:00.000Z",
          "1.0.0": "2025-01-01T00:00:00.000Z",
        },
        versions: {
          "0.9.0": { dist: { integrity: "sha512-previous" } },
          "1.0.0": {
            dist: { integrity: "sha512-script" },
            scripts: { postinstall: "node install.js" },
          },
        },
      }),
    })).at(0)

    expect(review).toMatchObject({ verdict: "ask", reasons: ["lifecycle-script"] })
  })

  test("asks about a mature package name that imitates a popular dependency", async () => {
    const review = (await Slopsquatting.inspect("npm install reactt", {
      now,
      fetch: fetch({
        "dist-tags": { latest: "1.0.0" },
        time: {
          created: "2020-01-01T00:00:00.000Z",
          "0.9.0": "2024-01-01T00:00:00.000Z",
          "1.0.0": "2025-01-01T00:00:00.000Z",
        },
        versions: {
          "0.9.0": { dist: { integrity: "sha512-previous" } },
          "1.0.0": { dist: { integrity: "sha512-current" } },
        },
      }),
    })).at(0)

    expect(review).toMatchObject({ verdict: "ask", reasons: ["similar-to-react"] })
  })

  test("denies a package missing from the registry", async () => {
    const review = (await Slopsquatting.inspect("npm install reactt", { now, fetch: fetch({}, 404) })).at(0)

    expect(review).toMatchObject({ verdict: "deny", reasons: ["package-not-found"] })
  })

  test("denies a yanked PyPI release", async () => {
    const review = (await Slopsquatting.inspect("pip install requests==1.0.0", {
      now,
      fetch: fetch({
        info: { version: "1.0.0" },
        releases: {
          "1.0.0": [{ yanked: true, upload_time_iso_8601: "2020-01-01T00:00:00.000Z" }],
        },
      }),
    })).at(0)

    expect(review).toMatchObject({ name: "requests", registry: "pypi", verdict: "deny", reasons: ["yanked-release"] })
  })

  test("asks before installing dependencies declared outside the command", async () => {
    const review = (await Slopsquatting.inspect("npm install", { now })).at(0)

    expect(review).toMatchObject({
      name: "declared-dependencies",
      registry: "unknown",
      verdict: "ask",
      reasons: ["unsupported-package-source"],
    })
  })
})
