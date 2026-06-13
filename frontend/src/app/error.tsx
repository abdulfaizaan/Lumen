"use client"

import { useEffect } from "react"
import { AlertCircle } from "lucide-react"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Global application error:", error)
  }, [error])

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-black text-white p-8 text-center relative">
      <div className="absolute inset-0 bg-red-900/10 blur-[150px] pointer-events-none" />
      <div className="relative z-10 max-w-xl w-full bg-[#0a0a0a] border border-white/10 rounded-3xl p-10 shadow-2xl">
        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-6" />
        <h1 className="text-3xl font-heading mb-4 text-white">Something went wrong</h1>
        <p className="text-gray-400 mb-8 leading-relaxed">
          An unexpected error occurred in the application. Our team has been notified.
        </p>
        <button
          onClick={() => reset()}
          className="bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-full transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  )
}
