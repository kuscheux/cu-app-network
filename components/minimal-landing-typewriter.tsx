"use client"

import { useState, useEffect } from "react"
import { motion } from "motion/react"
import { cn } from "@/lib/utils"

/**
 * Minimal one-line typewriter for landing page.
 * Same background as Design System (AppBuilderStudio full): bg + blur orbs + dot pattern only.
 * Centered X and Y; only 1.5 lines visible, text falls off to the right.
 */

const LINE = "This is the config experience."
const CHAR_MS = 55
const CURSOR_BLINK_S = 0.53

export function MinimalLandingTypewriter({ className }: { className?: string }) {
  const [visibleLength, setVisibleLength] = useState(0)
  const [showCursor, setShowCursor] = useState(true)

  // Typewriter: advance one character
  useEffect(() => {
    if (visibleLength >= LINE.length) return
    const t = setTimeout(() => setVisibleLength((n) => n + 1), CHAR_MS)
    return () => clearTimeout(t)
  }, [visibleLength])

  // Cursor blink
  useEffect(() => {
    const id = setInterval(() => setShowCursor((c) => !c), CURSOR_BLINK_S * 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div
      className={cn(
        "h-full w-full flex flex-col bg-[#0a0a0a] relative overflow-hidden",
        className
      )}
    >
      {/* Cloned background from Design System (AppBuilderStudio full) — no extra glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute rounded-full blur-[100px]"
          style={{
            top: "-160px",
            right: "20%",
            width: "320px",
            height: "320px",
            background: "rgba(168, 85, 247, 0.2)",
          }}
        />
        <div
          className="absolute rounded-full blur-[100px]"
          style={{
            bottom: "-160px",
            left: "-160px",
            width: "320px",
            height: "320px",
            background: "rgba(59, 130, 246, 0.2)",
          }}
        />
        <div
          className="absolute rounded-full blur-[100px]"
          style={{
            bottom: "20%",
            right: "-100px",
            width: "280px",
            height: "280px",
            background: "rgba(20, 184, 166, 0.15)",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: "radial-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        />
      </div>

      {/* Center X and Y: one line, 1.5 lines height, text falls off right */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-4">
        <div
          className="overflow-hidden flex items-center justify-center"
          style={{
            width: "26ch",
            height: "1.5em",
            lineHeight: "1em",
          }}
        >
          <span
            className="text-white/90 text-lg md:text-xl font-medium whitespace-nowrap inline-block text-left"
            style={{
              maskImage: "linear-gradient(to right, black 0%, black 70%, transparent 100%)",
              WebkitMaskImage: "linear-gradient(to right, black 0%, black 70%, transparent 100%)",
            }}
          >
            {LINE.slice(0, visibleLength)}
            <motion.span
              className="inline-block w-[2px] h-[0.85em] align-text-bottom bg-emerald-400 ml-0.5"
              animate={{ opacity: showCursor ? 1 : 0 }}
              transition={{ duration: 0.05 }}
              aria-hidden
            />
          </span>
        </div>
      </div>
    </div>
  )
}
