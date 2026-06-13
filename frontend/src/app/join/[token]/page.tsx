"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { GlassPanel } from "@/components/ui/GlassPanel"
import { AuraButton } from "@/components/ui/AuraButton"
import { ParticleBackground } from "@/components/ui/ParticleBackground"
import { ShieldCheck, Camera, AlertCircle, CheckCircle2 } from "lucide-react"

import { useParams } from "next/navigation"

type JoinState = "consent" | "requesting_media" | "permission_denied" | "joining"

export default function CustomerJoinPage() {
  const [step, setStep] = React.useState<JoinState>("consent")
  const params = useParams()

  const handleConsent = () => {
    setStep("requesting_media")
    
    // Simulate media request and redirect
    setTimeout(() => {
      setStep("joining")
      
      setTimeout(() => {
        const name = new URLSearchParams(window.location.search).get('name') || 'Customer'
        window.location.href = `/session/${params.token}?role=customer&participantName=${encodeURIComponent(name)}`
      }, 1000)
    }, 2000)
  }

  return (
    <main className="h-screen w-screen overflow-hidden relative flex items-center justify-center">
      <ParticleBackground />

      <AnimatePresence mode="wait">
        {step === "consent" && (
          <motion.div
            key="consent"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="w-full max-w-md px-6 relative z-10"
          >
            <GlassPanel className="p-8 flex flex-col items-center text-center space-y-6">
              <div className="w-16 h-16 rounded-full bg-[var(--color-lumen-pure)]/10 flex items-center justify-center mb-2">
                <ShieldCheck className="w-8 h-8 text-[var(--color-lumen-pure)]" />
              </div>
              
              <div>
                <h1 className="text-2xl font-heading text-white mb-2">Secure Support Session</h1>
                <p className="text-gray-400 text-sm leading-relaxed">
                  You are joining a secure, end-to-end encrypted support session. 
                  For quality and compliance purposes, this session's video, audio, and chat may be recorded.
                </p>
              </div>

              <div className="w-full pt-4">
                <AuraButton variant="primary" className="w-full" onClick={handleConsent}>
                  I Agree & Join
                </AuraButton>
              </div>
            </GlassPanel>
          </motion.div>
        )}

        {step === "requesting_media" && (
          <motion.div
            key="requesting_media"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-md px-6 relative z-10 text-center flex flex-col items-center space-y-6"
          >
             <div className="relative w-20 h-20 flex items-center justify-center">
               <motion.div 
                 className="absolute inset-0 border-2 border-[var(--color-lumen-pure)] rounded-full border-t-transparent"
                 animate={{ rotate: 360 }}
                 transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
               />
               <Camera className="w-8 h-8 text-[var(--color-lumen-pure)]" />
             </div>
             <h2 className="text-xl font-heading text-white">Preparing the Glass Room</h2>
             <p className="text-gray-400 text-sm max-w-[250px]">
               Please allow camera and microphone permissions when prompted by your browser.
             </p>
          </motion.div>
        )}

        {step === "permission_denied" && (
          <motion.div
            key="permission_denied"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="w-full max-w-md px-6 relative z-10"
          >
            <GlassPanel className="p-8 flex flex-col space-y-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-full bg-[var(--color-lumen-error)]/10 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-6 h-6 text-[var(--color-lumen-error)]" />
                </div>
                <div>
                  <h2 className="text-xl font-heading text-white">Permissions Denied</h2>
                  <p className="text-sm text-gray-400">We need access to see and hear you.</p>
                </div>
              </div>

              <div className="bg-black/30 rounded-2xl p-6 border border-white/5 space-y-4">
                <h3 className="text-sm text-white font-medium">How to fix this:</h3>
                <ol className="text-sm text-gray-400 space-y-3 list-decimal list-inside">
                  <li>Click the <Camera className="w-4 h-4 inline mx-1" /> icon in your browser's URL bar.</li>
                  <li>Change the setting to <strong>"Allow"</strong>.</li>
                  <li>Refresh this page to try again.</li>
                </ol>
              </div>

              <div className="flex gap-4">
                <AuraButton variant="secondary" className="flex-1" onClick={() => window.location.reload()}>
                  Refresh Page
                </AuraButton>
                <AuraButton variant="ghost" className="flex-1" onClick={() => setStep("joining")}>
                  Join Audio Only
                </AuraButton>
              </div>
            </GlassPanel>
          </motion.div>
        )}

        {step === "joining" && (
          <motion.div
            key="joining"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md px-6 relative z-10 text-center flex flex-col items-center space-y-6"
          >
             <div className="w-20 h-20 rounded-full bg-[var(--color-lumen-success)]/10 flex items-center justify-center">
               <CheckCircle2 className="w-10 h-10 text-[var(--color-lumen-success)]" />
             </div>
             <h2 className="text-xl font-heading text-white">Connection Established</h2>
             <p className="text-gray-400 text-sm">Entering the Glass Room...</p>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  )
}
