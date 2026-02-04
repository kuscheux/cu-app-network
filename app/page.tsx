"use client"

import { Toaster } from "sonner"
import { Loader2 } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { useStrippedMode } from "@/lib/stripped-mode-context"
import { UnifiedPlatform } from "@/components/unified-platform"
import { ErrorBoundary } from "@/components/error-boundary"

export default function Home() {
  const { loading } = useAuth()
  const { strippedMode } = useStrippedMode()
  const skipAuthGate = strippedMode

  if (!skipAuthGate && loading) {
    return (
      <main className="h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </main>
    )
  }

  return (
    <main className="h-screen bg-background">
      <ErrorBoundary>
        <UnifiedPlatform />
      </ErrorBoundary>
      <Toaster position="bottom-right" />
    </main>
  )
}
