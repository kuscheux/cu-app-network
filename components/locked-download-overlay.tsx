"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"

interface LockedDownloadOverlayProps {
  locked: boolean
  children: React.ReactNode
  className?: string
  /** Hover text when locked. Default: "Workin on it" */
  hoverText?: string
}

/**
 * Wraps a download/export button. When locked, shows a visual overlay and
 * on hover displays "Workin on it" (or custom hoverText). Button should be disabled when locked.
 */
export function LockedDownloadOverlay({
  locked,
  children,
  className,
  hoverText = "Workin on it",
}: LockedDownloadOverlayProps) {
  const [hover, setHover] = useState(false)

  if (!locked) return <>{children}</>

  return (
    <span
      className={cn("relative inline-flex rounded-md overflow-hidden", className)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {children}
      <span
        className="absolute inset-0 flex items-center justify-center bg-black/50 cursor-not-allowed pointer-events-auto"
        aria-hidden
      >
        {hover && (
          <span className="text-sm font-medium text-white drop-shadow-md px-2 py-1 rounded bg-black/60">
            {hoverText}
          </span>
        )}
      </span>
    </span>
  )
}
