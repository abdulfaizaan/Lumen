"use client"

import { useEffect } from "react"
import { AlertCircle } from "lucide-react"

export default function SessionError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Session error:", error)
  }, [error])

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-black text-white p-8 text-center relative">
      <div className="absolute inset-0 bg-amber-900/10 blur-[150px] pointer-events-none" />
      <div className="relative z-10 max-w-xl w-full bg-[#0a0a0a] border border-white/10 rounded-3xl p-10 shadow-2xl">
        <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-6" />
        <h1 className="text-3xl font-heading mb-4 text-white">Session Error</h1>
        <p className="text-gray-400 mb-8 leading-relaxed">
          There was a problem loading or maintaining this session. It might have ended or encountered a connection error.
        </p>
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => reset()}
            className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-500 px-6 py-3 rounded-full transition-colors"
          >
            Retry Connection
          </button>
          <button
            onClick={() => window.location.href = "/"}
            className="bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-full transition-colors"
          >
            Return Home
          </button>
        </div>
      </div>
    </div>
  )
}
