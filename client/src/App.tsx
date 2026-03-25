import { useEffect, useState } from "react"
import { FlatScoutAgent } from "@/components/flatscout-agent"
import { LoginScreen } from "@/components/login-screen"
import { API_URL } from "@/lib/api"

interface AuthState {
  enabled: boolean
  authenticated: boolean
  username?: string
}

function App() {
  const [authState, setAuthState] = useState<AuthState | null>(null)
  const [authError, setAuthError] = useState("")

  const loadSession = async () => {
    try {
      const response = await fetch(`${API_URL}/api/auth/session`, {
        credentials: "include",
      })
      const data = (await response.json()) as AuthState

      setAuthState(data)
      setAuthError("")
    } catch {
      setAuthError("Unable to reach the auth service.")
    }
  }

  useEffect(() => {
    void loadSession()
  }, [])

  const handleLogout = async () => {
    await fetch(`${API_URL}/api/auth/logout`, {
      method: "POST",
      credentials: "include",
    })

    setAuthState((current) =>
      current
        ? {
            ...current,
            authenticated: false,
          }
        : current
    )
  }

  if (!authState) {
    return (
      <div className="dark flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        {authError || "Checking access..."}
      </div>
    )
  }

  if (authState.enabled && !authState.authenticated) {
    return (
      <div className="dark">
        <LoginScreen onAuthenticated={loadSession} />
      </div>
    )
  }

  return (
    <div className="dark relative">
      {authState.enabled ? (
        <button
          className="absolute right-4 top-4 z-50 rounded-full border border-white/10 bg-black/50 px-4 py-2 text-xs font-medium text-white backdrop-blur transition hover:bg-black/70"
          onClick={() => void handleLogout()}
          type="button"
        >
          Sign out{authState.username ? ` (${authState.username})` : ""}
        </button>
      ) : null}
      <FlatScoutAgent />
    </div>
  )
}

export default App
