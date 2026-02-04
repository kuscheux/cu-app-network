"use client"

import { useState, useEffect, useRef } from "react"
import { motion, animate } from "motion/react"
import { cn } from "@/lib/utils"

/**
 * Typewriter scroller — dark analytics style.
 * Uses Motion API: cursor blink, smooth scroll, line transitions.
 * "cu" and "cu os" use Cyrovoid; copy is config/CU.APP themed.
 */

const LINES: string[] = [
  "Enable Configuration Matrix",
  "Measure your real config experience.",
  "",
  "Get insight into identity, design tokens, features, IVR, products, rules, fraud, compliance—every tier that powers a great member experience for your site or application.",
  "",
  "Real Config Score — 96 · Great",
  "Above 90 · More than 75% of tenants ship with a great config.",
  "Measures the overall config quality. To provide a good experience, your matrix should have a RCS of more than 90.",
  "",
  "cu · cu os",
  "One JSON. Every channel. IVR, Mobile, Web, Chat.",
  "380+ keys · 16 tiers · 700+ tables mapped.",
]

const CHAR_MS = 42
const PAUSE_AFTER_LINE_MS = 1200
const SCROLL_DURATION_S = 0.8
const CURSOR_BLINK_DURATION_S = 0.53

export function TypewriterScroller({ className }: { className?: string }) {
  const [lineIndex, setLineIndex] = useState(0)
  const [visibleLength, setVisibleLength] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const lineRefs = useRef<(HTMLParagraphElement | null)[]>(Array(LINES.length).fill(null))

  const currentLine = LINES[lineIndex] ?? ""
  const isLineComplete = visibleLength >= currentLine.length

  // Typewriter: advance character
  useEffect(() => {
    if (lineIndex >= LINES.length) return
    const line = LINES[lineIndex]
    if (visibleLength >= line.length) return

    const t = setTimeout(() => {
      setVisibleLength((prev) => prev + 1)
    }, CHAR_MS)
    return () => clearTimeout(t)
  }, [lineIndex, visibleLength])

  // When line complete: Motion-animated scroll then next line
  useEffect(() => {
    if (lineIndex >= LINES.length || !isLineComplete) return

    const container = containerRef.current
    const lineEl = lineRefs.current[lineIndex]

    const scrollToCurrent = () => {
      if (!container || !lineEl) return
      const targetScrollTop =
        lineEl.offsetTop - container.offsetHeight / 2 + lineEl.offsetHeight / 2
      const from = container.scrollTop
      const to = Math.max(0, Math.min(targetScrollTop, container.scrollHeight - container.offsetHeight))
      animate(from, to, {
        duration: SCROLL_DURATION_S,
        ease: "easeInOut",
        onUpdate: (v) => {
          if (containerRef.current) containerRef.current.scrollTop = v
        },
      })
    }

    const goNext = () => {
      if (lineIndex + 1 >= LINES.length) {
        setLineIndex(0)
        setVisibleLength(0)
        if (containerRef.current) {
          animate(containerRef.current.scrollTop, 0, {
            duration: SCROLL_DURATION_S,
            ease: "easeInOut",
            onUpdate: (v) => {
              if (containerRef.current) containerRef.current.scrollTop = v
            },
          })
        }
        return
      }
      setLineIndex((i) => i + 1)
      setVisibleLength(0)
      requestAnimationFrame(() => {
        requestAnimationFrame(scrollToCurrent)
      })
    }

    const pause = setTimeout(scrollToCurrent, 200)
    const next = setTimeout(goNext, PAUSE_AFTER_LINE_MS)
    return () => {
      clearTimeout(pause)
      clearTimeout(next)
    }
  }, [lineIndex, isLineComplete])

  // Render "cu" and "cu os" with Cyrovoid
  function renderWithCuMarkup(text: string, upTo: number) {
    const slice = text.slice(0, upTo)
    const parts: Array<{ key: string; font: "cyrovoid" | "sans"; text: string }> = []
    let i = 0
    const lower = slice.toLowerCase()
    while (i < slice.length) {
      if (lower.slice(i).startsWith("cu os")) {
        parts.push({ key: `cuos-${i}`, font: "cyrovoid", text: slice.slice(i, i + 5) })
        i += 5
      } else if (lower.slice(i).startsWith("cu ")) {
        parts.push({ key: `cu-${i}`, font: "cyrovoid", text: slice.slice(i, i + 3) })
        i += 3
      } else if (lower.slice(i) === "cu" || (lower.slice(i).startsWith("cu") && (i + 2 >= slice.length || /\W/.test(slice[i + 2])))) {
        parts.push({ key: `cu-${i}`, font: "cyrovoid", text: slice.slice(i, i + 2) })
        i += 2
      } else {
        const nextCu = lower.indexOf("cu", i)
        const end = nextCu === -1 ? slice.length : nextCu
        if (end > i) {
          parts.push({ key: `txt-${i}`, font: "sans", text: slice.slice(i, end) })
          i = end
        }
      }
    }
    return (
      <>
        {parts.map((p) =>
          p.font === "cyrovoid" ? (
            <span key={p.key} className="text-emerald-400" style={{ fontFamily: "var(--font-cu-wordmark)" }}>
              {p.text}
            </span>
          ) : (
            <span key={p.key}>{p.text}</span>
          )
        )}
      </>
    )
  }

  return (
    <motion.div
      className={cn(
        "rounded-2xl border border-white/10 bg-[#0c0c0c] text-[#e5e5e5] overflow-hidden shadow-2xl",
        className
      )}
      initial={false}
    >
      {/* Top bar — desktop / mobile / production style */}
      <div className="flex items-center gap-4 border-b border-white/10 px-4 py-3 bg-[#141414]">
        <div className="flex gap-1">
          {["Desktop", "Mobile", "Production"].map((tab) => (
            <span
              key={tab}
              className={cn(
                "px-3 py-1.5 rounded-md text-sm font-medium",
                tab === "Desktop" ? "bg-white/10 text-white" : "text-white/50 hover:text-white/80"
              )}
            >
              {tab}
            </span>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2 text-xs text-white/50">
          <span>Last 7 days</span>
        </div>
      </div>

      {/* Scrolling typewriter area */}
      <ScrollAreaWithTypewriter
        containerRef={containerRef}
        lineRefs={lineRefs}
        lines={LINES}
        lineIndex={lineIndex}
        visibleLength={visibleLength}
        renderWithCuMarkup={renderWithCuMarkup}
      />

      {/* Bottom metrics strip — Real Config Score style */}
      <motion.div
        className="border-t border-white/10 px-4 py-3 bg-[#0f0f0f] flex items-center justify-between gap-4 flex-wrap"
        initial={false}
      >
        <div className="flex items-center gap-3">
          <span className="text-sm text-white/60">Real Config Score</span>
          <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
            <motion.span
              className="h-2 w-2 rounded-full bg-emerald-400"
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
            />
            96 · Great
          </span>
        </div>
        <div className="text-xs text-white/40">
          380+ keys · 16 tiers · IVR, Mobile, Web, Chat
        </div>
      </motion.div>
    </motion.div>
  )
}

function ScrollAreaWithTypewriter({
  containerRef,
  lineRefs,
  lines,
  lineIndex,
  visibleLength,
  renderWithCuMarkup,
}: {
  containerRef: React.RefObject<HTMLDivElement | null>
  lineRefs: React.MutableRefObject<(HTMLParagraphElement | null)[]>
  lines: string[]
  lineIndex: number
  visibleLength: number
  renderWithCuMarkup: (text: string, upTo: number) => React.ReactNode
}) {
  return (
    <motion.div
      ref={containerRef}
      className="h-[320px] overflow-y-auto overflow-x-hidden scroll-smooth px-6 py-5"
      style={{ scrollBehavior: "smooth" }}
      initial={false}
    >
      <div className="space-y-4">
        {lines.map((line, i) => {
          const isActive = i === lineIndex
          const showUpTo = isActive ? visibleLength : line.length
          const isEmpty = line === ""

          return (
            <motion.p
              key={i}
              ref={(el) => {
                lineRefs.current[i] = el
              }}
              className={cn(
                "text-sm leading-relaxed min-h-[1.5em]",
                isEmpty && "opacity-0 select-none",
                isActive && "text-white border-l-2 border-emerald-500/70 pl-3 -ml-1",
                !isActive && "text-white/70"
              )}
              animate={{
                opacity: isEmpty ? 0 : isActive ? 1 : 0.7,
              }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              {renderWithCuMarkup(line, showUpTo)}
              {isActive && (
                <motion.span
                  className="inline-block w-[2px] h-[1em] align-text-bottom bg-emerald-400 ml-0.5"
                  animate={{ opacity: [1, 0, 1] }}
                  transition={{
                    repeat: Infinity,
                    duration: CURSOR_BLINK_DURATION_S,
                    ease: "easeInOut",
                  }}
                  aria-hidden
                />
              )}
            </motion.p>
          )
        })}
      </div>
    </motion.div>
  )
}
