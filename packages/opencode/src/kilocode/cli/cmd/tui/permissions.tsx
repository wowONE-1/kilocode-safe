import type { PermissionRequest } from "@kilocode/sdk/v2"
import { useTheme } from "@tui/context/theme"
import { MemoryPermissionRegistry } from "@/kilocode/cli/cmd/tui/routes/session/memory-permission"

function MemoryBody(props: { request: PermissionRequest }) {
  const { theme } = useTheme()
  const value = String(props.request.metadata?.text ?? props.request.metadata?.query ?? "")
  return (
    <box paddingLeft={1} flexDirection="column">
      <text fg={theme.textMuted}>{value || "No memory content provided"}</text>
    </box>
  )
}

function SecurityPackageBody(props: { request: PermissionRequest }) {
  const { theme } = useTheme()

  const command = String(props.request.metadata?.command ?? "")
  const packages = Array.isArray(props.request.metadata?.packages)
    ? props.request.metadata.packages.map(String)
    : []

  return (
    <box paddingLeft={1} flexDirection="column">
      <text fg={theme.textMuted}>
        {packages.length > 0
          ? `Packages: ${packages.join(", ")}`
          : "Package installation detected"}
      </text>

      {command ? (
        <text fg={theme.textMuted}>
          {`Command: ${command}`}
        </text>
      ) : null}
    </box>
  )
}

export namespace MemoryPermission {
  export function register() {
    MemoryPermissionRegistry.register("kilo_memory_save", (request) => {
      const action = String(request.metadata?.action ?? "save")
      return {
        icon: "◇",
        title: `Memory ${action}`,
        body: <MemoryBody request={request} />,
      }
    })
    MemoryPermissionRegistry.register("kilo_memory_recall", (request) => ({
      icon: "◇",
      title: "Memory recall",
      body: <MemoryBody request={request} />,
    }))
    MemoryPermissionRegistry.register("security_package", (request) => ({
      icon: "⚠",
      title: "Package security review",
      body: <SecurityPackageBody request={request} />,
    }))
  }
}
