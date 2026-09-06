import { expect, test } from "bun:test"

// client.ts binds window.fetch once at import time, so every test must share the
// same window whose fetch writes into a swappable calls array.
let calls: Array<{ url: string; method: string; body: unknown }> = []
let respond = () =>
  new Response(JSON.stringify({ permission: { edit: { "*": "allow" } } }), {
    headers: { "content-type": "application/json" },
  })

const win = {
  fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
    const req = input instanceof Request ? input : new Request(input, init)
    calls.push({ url: req.url, method: req.method, body: req.body ? await req.json() : undefined })
    return respond()
  },
}

test("permission modes update the selected session without replacing tool rules", async () => {
  const calls = setup()
  const client = await import("./client")
  for (const mode of ["auto", "vanilla", "secure", "ask", "dos_llms_secure"] as const) {
    await client.setProjectPermission({ url: "http://localhost:4097", dir: "/worktree" }, "ses_selected", mode)
    const request = calls.at(-1)!
    expect(request.method).toBe("PATCH")
    expect(new URL(request.url).pathname).toBe("/session/ses_selected")
    expect(new URL(request.url).searchParams.get("directory")).toBe("/worktree")
    expect(request.body).toEqual({
      permission: [{ permission: "kilo_permission_mode", pattern: mode, action: "allow" }],
    })
  }
})

test("new terminals resume a session with its permission mode already saved", async () => {
  const calls = setup()
  const client = await import("./client")
  const prior = respond
  respond = () => Response.json(calls.length === 1 ? { id: "ses_new" } : { id: "pty_new" })
  try {
    await client.createProjectPty(
      { url: "http://localhost:4097", dir: "/worktree", scope: "project" },
      "/worktree",
      "Kilo 1",
      "dos_llms_secure",
    )
    expect(calls).toHaveLength(2)
    expect(calls.at(0)?.body).toEqual({
      permission: [{ permission: "kilo_permission_mode", pattern: "dos_llms_secure", action: "allow" }],
    })
    expect(calls.at(1)?.body).toEqual({
      command: "kilo",
      cwd: "/worktree",
      title: "Kilo 1",
      args: ["/worktree", "--session", "ses_new"],
    })
  } finally {
    respond = prior
  }
})

test("a failed terminal launch removes only the new unused session", async () => {
  const calls = setup()
  const client = await import("./client")
  const prior = respond
  respond = () =>
    calls.length === 2
      ? Response.json({ message: "Cannot start terminal" }, { status: 500 })
      : Response.json(calls.length === 1 ? { id: "ses_new" } : true)
  try {
    await expect(
      client.createProjectPty(
        { url: "http://localhost:4097", dir: "/worktree", scope: "project" },
        "/worktree",
        "Kilo 1",
        "ask",
      ),
    ).rejects.toThrow("Create terminal")
    expect(calls).toHaveLength(3)
    expect(calls.at(-1)?.method).toBe("DELETE")
    expect(new URL(calls.at(-1)!.url).pathname).toBe("/session/ses_new")
  } finally {
    respond = prior
  }
})

function setup() {
  calls = []
  Object.defineProperty(globalThis, "window", { value: win, configurable: true })
  return calls
}

test("config writes include the selected directory", async () => {
  const calls = setup()
  const client = await import("./client")
  const query = { url: "http://kilo:secret@127.0.0.1:4097", dir: "/tmp/project", scope: "project" as const }

  await client.saveConfig(query, { permission: { edit: { "*": "allow" } } })
  await client.unsetConfig(query, [["permission", "edit"]])
  await client.patchConfig(query, { indexing: { provider: "ollama" } }, [["indexing", "model"]])

  expect(calls).toHaveLength(3)

  const save = calls[0]
  const unset = calls[1]
  const patch = calls[2]
  expect(save.method).toBe("PATCH")
  expect(new URL(save.url).searchParams.get("directory")).toBe("/tmp/project")
  expect(save.body).toEqual({ scope: "project", set: { permission: { edit: { "*": "allow" } } } })

  expect(unset.method).toBe("PATCH")
  expect(new URL(unset.url).searchParams.get("directory")).toBe("/tmp/project")
  expect(unset.body).toEqual({ scope: "project", unset: [["permission", "edit"]] })

  expect(patch.method).toBe("PATCH")
  expect(new URL(patch.url).searchParams.get("directory")).toBe("/tmp/project")
  expect(patch.body).toEqual({
    scope: "project",
    set: { indexing: { provider: "ollama" } },
    unset: [["indexing", "model"]],
  })
})

test("viewed snapshots post the presence payload against the selected directory", async () => {
  const calls = setup()
  const client = await import("./client")
  const query = { url: "http://kilo:secret@127.0.0.1:4097", dir: "/tmp/project" }
  const viewer = { id: "11111111-1111-4111-8111-111111111111", active: false }

  await client.viewProjectSessions(query, viewer, ["ses_selected", "ses_terminal"], [])

  expect(calls).toHaveLength(1)

  const viewed = calls[0]
  expect(viewed.method).toBe("POST")
  expect(new URL(viewed.url).pathname).toBe("/session/viewed")
  expect(new URL(viewed.url).searchParams.get("directory")).toBe("/tmp/project")
  expect(viewed.body).toEqual({
    viewer: { id: "11111111-1111-4111-8111-111111111111", active: false },
    attached: ["ses_selected", "ses_terminal"],
    visible: [],
  })
})
