"use client"

import { TypewriterScroller } from "@/components/typewriter-scroller"

export default function TypewriterPage() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        <TypewriterScroller />
      </div>
    </main>
  )
}
