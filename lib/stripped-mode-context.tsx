"use client"

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react"

const STORAGE_KEY = "cu_app_stripped_mode"

interface StrippedModeContextValue {
  strippedMode: boolean
  setStrippedMode: (value: boolean) => void
}

const StrippedModeContext = createContext<StrippedModeContextValue | null>(null)

function getInitial(): boolean {
  if (typeof window === "undefined") return true
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    return v === "true"
  } catch {
    return true
  }
}

export function StrippedModeProvider({ children }: { children: ReactNode }) {
  const [strippedMode, setStrippedModeState] = useState(true)

  useEffect(() => {
    setStrippedModeState(getInitial())
  }, [])

  const setStrippedMode = useCallback((value: boolean) => {
    setStrippedModeState(value)
    try {
      localStorage.setItem(STORAGE_KEY, String(value))
    } catch {
      // ignore
    }
  }, [])

  return (
    <StrippedModeContext.Provider value={{ strippedMode, setStrippedMode }}>
      {children}
    </StrippedModeContext.Provider>
  )
}

export function useStrippedMode(): StrippedModeContextValue {
  const ctx = useContext(StrippedModeContext)
  if (!ctx) {
    return {
      strippedMode: true,
      setStrippedMode: () => {},
    }
  }
  return ctx
}
