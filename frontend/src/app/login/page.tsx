"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { GlassPanel } from "@/components/ui/GlassPanel"
import { AuraButton } from "@/components/ui/AuraButton"
import { MonitorPlay, KeyRound, Mail, AlertCircle } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      })

      if (res?.error) {
        setError("Invalid credentials. Please check your email and password.")
      } else {
        router.push("/dashboard")
        router.refresh()
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-black flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[var(--color-lumen-pure)]/10 blur-[120px] rounded-full pointer-events-none" />

      <GlassPanel className="w-full max-w-md p-8 rounded-3xl relative z-10 border border-white/10 shadow-2xl">
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--color-lumen-pure)] to-blue-600 flex items-center justify-center mb-6 shadow-lg shadow-[var(--color-lumen-pure)]/20">
            <MonitorPlay className="w-8 h-8 text-white" />
          </div>
          <h1 className="font-heading text-3xl text-white mb-2 tracking-tight">Welcome Back</h1>
          <p className="text-gray-400 text-sm text-center">Sign in to your Lumen agent dashboard to manage your active sessions.</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <p className="text-sm text-red-200">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6" suppressHydrationWarning>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300 ml-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input 
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-[var(--color-lumen-pure)]/50 focus:ring-1 focus:ring-[var(--color-lumen-pure)]/50 transition-all"
                placeholder="agent@lumen.com"
                suppressHydrationWarning
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300 ml-1">Password</label>
            <div className="relative">
              <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input 
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-[var(--color-lumen-pure)]/50 focus:ring-1 focus:ring-[var(--color-lumen-pure)]/50 transition-all"
                placeholder="••••••••"
                suppressHydrationWarning
              />
            </div>
          </div>

          <AuraButton 
            type="submit" 
            className="w-full py-6 text-lg mt-4 shadow-[0_0_20px_rgba(56,189,248,0.2)]"
            disabled={isLoading}
            suppressHydrationWarning
          >
            {isLoading ? (
              <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              "Sign In to Dashboard"
            )}
          </AuraButton>
        </form>

        <div className="mt-8 text-center text-sm text-gray-500">
          Need an agent account? <a href="/register" className="text-[var(--color-lumen-pure)] hover:underline">Create one</a>
        </div>
      </GlassPanel>
    </main>
  )
}
