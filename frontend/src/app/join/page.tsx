"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { GlassPanel } from "@/components/ui/GlassPanel"
import { AuraButton } from "@/components/ui/AuraButton"
import { ParticleBackground } from "@/components/ui/ParticleBackground"
import { Users, Lock, User, AlertCircle } from "lucide-react"

export default function JoinMeetingPage() {
  const router = useRouter()
  const [meetingId, setMeetingId] = React.useState("")
  const [passcode, setPasscode] = React.useState("")
  const [name, setName] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [isJoining, setIsJoining] = React.useState(false)

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!meetingId || !passcode || !name) {
      setError("Please fill out all fields.")
      return
    }

    setIsJoining(true)

    try {
      const res = await fetch(`/api/sessions/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meetingId, passcode })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to validate meeting")
      }

      // Validated successfully. Route to the consent page using the joinToken
      // We pass the user's name as a query parameter
      router.push(`/join/${data.joinToken}?name=${encodeURIComponent(name)}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
      setIsJoining(false)
    }
  }

  // Auto format meeting ID
  const handleMeetingIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '')
    if (val.length > 10) val = val.substring(0, 10)
    
    // Format as 123 456 7890
    if (val.length > 6) {
      val = `${val.substring(0,3)} ${val.substring(3,6)} ${val.substring(6)}`
    } else if (val.length > 3) {
      val = `${val.substring(0,3)} ${val.substring(3)}`
    }
    setMeetingId(val)
  }

  return (
    <main className="h-screen w-screen overflow-hidden relative flex items-center justify-center bg-black">
      <ParticleBackground />
      
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[var(--color-lumen-pure)]/10 blur-[150px] rounded-full pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className="w-full max-w-md px-6 relative z-10"
      >
        <GlassPanel className="p-8 flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-[var(--color-lumen-pure)]/10 flex items-center justify-center mb-6">
            <Users className="w-8 h-8 text-[var(--color-lumen-pure)]" />
          </div>
          
          <h1 className="text-2xl font-heading text-white mb-2">Join a Meeting</h1>
          <p className="text-gray-400 text-sm mb-8">Enter your meeting credentials to join</p>

          {error && (
            <div className="w-full bg-red-500/10 border border-red-500/20 text-red-500 text-sm p-3 rounded-lg flex items-center gap-2 mb-6">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleJoin} className="w-full space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-400 ml-1">Meeting ID</label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input 
                  type="text" 
                  value={meetingId}
                  onChange={handleMeetingIdChange}
                  placeholder="123 456 7890" 
                  className="w-full bg-black/50 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-[var(--color-lumen-pure)]/50 focus:ring-1 focus:ring-[var(--color-lumen-pure)]/50 transition-all font-mono"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-400 ml-1">Passcode</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input 
                  type="text" 
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value.toUpperCase())}
                  placeholder="XXXXXX" 
                  className="w-full bg-black/50 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-[var(--color-lumen-pure)]/50 focus:ring-1 focus:ring-[var(--color-lumen-pure)]/50 transition-all font-mono"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-400 ml-1">Your Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe" 
                  className="w-full bg-black/50 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-[var(--color-lumen-pure)]/50 focus:ring-1 focus:ring-[var(--color-lumen-pure)]/50 transition-all"
                />
              </div>
            </div>

            <div className="pt-4">
              <AuraButton 
                variant="primary" 
                className="w-full py-4 text-sm font-medium shadow-[0_0_20px_rgba(0,229,255,0.2)]" 
                disabled={isJoining}
              >
                {isJoining ? "Validating..." : "Join Meeting"}
              </AuraButton>
            </div>
          </form>
        </GlassPanel>
      </motion.div>
    </main>
  )
}
