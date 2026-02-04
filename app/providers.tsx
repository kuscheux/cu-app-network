"use client"

import type { ReactNode } from "react"
import { AuthProvider } from "@/lib/auth-context"
import { StrippedModeProvider } from "@/lib/stripped-mode-context"

export function Providers({ children }: { children: ReactNode }) {
  return (
    <StrippedModeProvider>
      <AuthProvider>{children}</AuthProvider>
    </StrippedModeProvider>
  )
}
