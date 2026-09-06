import { expect, test } from "bun:test"
import { configured, modes, permission } from "./permission"

test("permission selection uses the last supported mode and defaults to Secure", () => {
  expect(configured(undefined)).toBe("secure")
  for (const mode of modes) expect(configured(permission(mode.value))).toBe(mode.value)
  expect(
    configured([
      ...permission("auto"),
      ...permission("ask"),
      { permission: "bash", pattern: "auto", action: "allow" },
      { permission: "kilo_permission_mode", pattern: "future", action: "allow" },
      { permission: "kilo_permission_mode", pattern: "auto", action: "deny" },
    ]),
  ).toBe("ask")
})
