"use client"

import React from "react"
import { useParams, useRouter } from "next/navigation"
import { GlassPanel } from "@/components/ui/GlassPanel"
import { AuraButton } from "@/components/ui/AuraButton"
import { Star, CheckCircle } from "lucide-react"

export default function CSATPage() {
  const params = useParams()
  const router = useRouter()
  const [rating, setRating] = React.useState(0)
  const [hoverRating, setHoverRating] = React.useState(0)
  const [feedback, setFeedback] = React.useState("")
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [submitted, setSubmitted] = React.useState(false)

  const handleSubmit = async () => {
    if (rating === 0) return
    setIsSubmitting(true)
    try {
      await fetch(`/api/sessions/${params.id}/csat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, feedback }),
      })
      setSubmitted(true)
    } catch {
      setIsSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <main className="h-screen w-screen flex items-center justify-center bg-black relative">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-900/20 via-black to-blue-900/20 blur-3xl pointer-events-none" />
        <GlassPanel className="p-8 max-w-md w-full flex flex-col items-center text-center">
          <CheckCircle className="w-16 h-16 text-emerald-500 mb-4" />
          <h1 className="text-2xl font-heading text-white mb-2">Thank You!</h1>
          <p className="text-gray-400 mb-6">Your feedback has been submitted successfully.</p>
          <AuraButton onClick={() => router.push("/")}>Return Home</AuraButton>
        </GlassPanel>
      </main>
    )
  }

  return (
    <main className="h-screen w-screen flex items-center justify-center bg-black relative">
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-900/20 via-black to-blue-900/20 blur-3xl pointer-events-none" />
      
      <GlassPanel className="p-8 max-w-md w-full">
        <h1 className="text-2xl font-heading text-white mb-2 text-center">Rate Your Experience</h1>
        <p className="text-gray-400 text-sm text-center mb-6">
          How was your support session today?
        </p>

        <div className="flex justify-center gap-2 mb-6">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              onClick={() => setRating(star)}
              className="p-1 transition-transform hover:scale-110"
              aria-label={`Rate ${star} stars`}
            >
              <Star
                className={`w-10 h-10 ${
                  star <= (hoverRating || rating)
                    ? "fill-amber-400 text-amber-400"
                    : "text-gray-600"
                } transition-colors`}
              />
            </button>
          ))}
        </div>

        <div className="mb-6">
          <textarea
            className="w-full bg-black/50 border border-white/10 rounded-xl p-4 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-[var(--color-lumen-pure)]/50 focus:ring-1 focus:ring-[var(--color-lumen-pure)]/50 resize-none h-32"
            placeholder="Tell us what went well or what could be improved... (Optional)"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
          />
        </div>

        <AuraButton 
          className="w-full" 
          onClick={handleSubmit} 
          disabled={rating === 0 || isSubmitting}
        >
          {isSubmitting ? "Submitting..." : "Submit Feedback"}
        </AuraButton>
      </GlassPanel>
    </main>
  )
}
