"use client"

import { useState, useEffect, useCallback } from "react"
import { useStrippedMode } from "@/lib/stripped-mode-context"

/** When true, all download/export buttons are locked with overlay + "Workin on it" hover. */
const DOWNLOADS_LOCKED = true

export interface ExportAllowedState {
  allowed: boolean
  reason: string | null
  loading: boolean
  refetch: () => void
}

/**
 * Returns whether export is allowed for the given tenant.
 * When DOWNLOADS_LOCKED is true, always returns allowed: false, reason: "Workin on it".
 * When Settings > "Admin / everything unlocked" is ON (and not locked), always allowed.
 * Otherwise: export allowed only when user has confirmed email and tenant claim/domain.
 */
export function useExportAllowed(tenantId: string | null): ExportAllowedState {
  const { strippedMode } = useStrippedMode()
  const [allowed, setAllowed] = useState(strippedMode)
  const [reason, setReason] = useState<string | null>(null)
  const [loading, setLoading] = useState(!strippedMode)

  const fetchAllowed = useCallback(async () => {
    if (strippedMode) {
      setAllowed(true)
      setReason(null)
      setLoading(false)
      return
    }
    if (!tenantId) {
      setAllowed(false)
      setReason("Confirm your email at your credit union's verified domain to export.")
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/export-allowed?tenantId=${encodeURIComponent(tenantId)}`)
      const data = await res.json().catch(() => ({}))
      setAllowed(data.allowed === true)
      setReason(data.reason ?? null)
    } catch {
      setAllowed(false)
      setReason("Could not check export permission.")
    } finally {
      setLoading(false)
    }
  }, [tenantId, strippedMode])

  useEffect(() => {
    fetchAllowed()
  }, [fetchAllowed])

  if (DOWNLOADS_LOCKED) {
    return {
      allowed: false,
      reason: "Workin on it",
      loading: false,
      refetch: () => {},
    }
  }

  return {
    allowed: strippedMode ? true : allowed,
    reason: strippedMode ? null : reason,
    loading: strippedMode ? false : loading,
    refetch: fetchAllowed,
  }
}
