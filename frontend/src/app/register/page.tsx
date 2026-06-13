"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { GlassPanel } from "@/components/ui/GlassPanel"
import { AuraButton } from "@/components/ui/AuraButton"
import { UserPlus, KeyRound, Mail, User, AlertCircle, CheckCircle2, ShieldCheck } from "lucide-react"

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState<"CUSTOMER" | "AGENT">("CUSTOMER")
  const [inviteCode, setInviteCode] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [success, setSuccess] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setFieldErrors({})

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          password,
          // Only send inviteCode if registering as AGENT
          ...(role === "AGENT" ? { inviteCode } : {}),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (data.details) {
          setFieldErrors(data.details)
        }
        setError(data.error || "Failed to register")
      } else {
        setSuccess(true)
        setTimeout(() => {
          router.push("/login")
        }, 2000)
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const getFieldError = (field: string) => {
    return fieldErrors[field]?.[0]
  }

  return (
    <main className="min-h-screen bg-black flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[var(--color-lumen-pure)]/10 blur-[120px] rounded-full pointer-events-none" />

      <GlassPanel className="w-full max-w-md p-8 rounded-3xl relative z-10 border border-white/10 shadow-2xl">
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--color-lumen-pure)] to-blue-600 flex items-center justify-center mb-6 shadow-lg shadow-[var(--color-lumen-pure)]/20">
            <UserPlus className="w-8 h-8 text-white" />
          </div>
          <h1 className="font-heading text-3xl text-white mb-2 tracking-tight">Create an Account</h1>
          <p className="text-gray-400 text-sm text-center">Register to join or host secure support sessions.</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <p className="text-sm text-red-200">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 rounded-xl bg-[var(--color-lumen-success)]/10 border border-[var(--color-lumen-success)]/20 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-[var(--color-lumen-success)] shrink-0 mt-0.5" />
            <p className="text-sm text-green-200">Account created successfully! Redirecting to login...</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300 ml-1">Full Name</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input 
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-[var(--color-lumen-pure)]/50 focus:ring-1 focus:ring-[var(--color-lumen-pure)]/50 transition-all"
                placeholder="Jane Doe"
                aria-label="Full name"
                id="register-name"
              />
            </div>
            {getFieldError("name") && (
              <p className="text-xs text-red-400 ml-1">{getFieldError("name")}</p>
            )}
          </div>

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
                placeholder="you@email.com"
                aria-label="Email address"
                id="register-email"
              />
            </div>
            {getFieldError("email") && (
              <p className="text-xs text-red-400 ml-1">{getFieldError("email")}</p>
            )}
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
                minLength={8}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-[var(--color-lumen-pure)]/50 focus:ring-1 focus:ring-[var(--color-lumen-pure)]/50 transition-all"
                placeholder="••••••••"
                aria-label="Password"
                id="register-password"
              />
            </div>
            {getFieldError("password") && (
              <p className="text-xs text-red-400 ml-1">{getFieldError("password")}</p>
            )}
            <p className="text-xs text-gray-500 ml-1">Min 8 characters, 1 uppercase, 1 number</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300 ml-1">I am a...</label>
            <div className="flex gap-4">
              <label 
                className={`flex-1 cursor-pointer rounded-xl border p-4 flex flex-col items-center gap-2 transition-all ${
                  role === "CUSTOMER" 
                    ? "bg-[var(--color-lumen-pure)]/10 border-[var(--color-lumen-pure)]" 
                    : "bg-white/5 border-white/10 opacity-60 hover:opacity-80"
                }`}
              >
                <input type="radio" name="role" value="CUSTOMER" checked={role === "CUSTOMER"} onChange={() => setRole("CUSTOMER")} className="hidden" />
                <User className="w-5 h-5 text-[var(--color-lumen-pure)]" />
                <span className="text-white font-medium text-sm">Customer</span>
                <span className="text-xs text-gray-400">Join sessions</span>
              </label>
              <label 
                className={`flex-1 cursor-pointer rounded-xl border p-4 flex flex-col items-center gap-2 transition-all ${
                  role === "AGENT" 
                    ? "bg-[var(--color-lumen-pure)]/10 border-[var(--color-lumen-pure)]" 
                    : "bg-white/5 border-white/10 opacity-60 hover:opacity-80"
                }`}
              >
                <input type="radio" name="role" value="AGENT" checked={role === "AGENT"} onChange={() => setRole("AGENT")} className="hidden" />
                <ShieldCheck className="w-5 h-5 text-[var(--color-lumen-pure)]" />
                <span className="text-white font-medium text-sm">Support Agent</span>
                <span className="text-xs text-gray-400">Requires invite code</span>
              </label>
            </div>
          </div>

          {/* Agent invite code field — only visible when AGENT is selected */}
          {role === "AGENT" && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
              <label className="text-sm font-medium text-gray-300 ml-1">Agent Invite Code</label>
              <div className="relative">
                <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input 
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  required={role === "AGENT"}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-[var(--color-lumen-pure)]/50 focus:ring-1 focus:ring-[var(--color-lumen-pure)]/50 transition-all font-mono"
                  placeholder="Enter invite code"
                  aria-label="Agent invite code"
                  id="register-invite-code"
                />
              </div>
              <p className="text-xs text-gray-500 ml-1">Contact your admin to get an invite code</p>
            </div>
          )}

          <AuraButton 
            type="submit" 
            className="w-full py-6 text-lg mt-4 shadow-[0_0_20px_rgba(56,189,248,0.2)]"
            disabled={isLoading || success}
          >
            {isLoading ? (
              <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              "Create Account"
            )}
          </AuraButton>
        </form>

        <div className="mt-8 text-center text-sm text-gray-500">
          Already have an account? <a href="/login" className="text-[var(--color-lumen-pure)] hover:underline">Sign in</a>
        </div>
      </GlassPanel>
    </main>
  )
}
