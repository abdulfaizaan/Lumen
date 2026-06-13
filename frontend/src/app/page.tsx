"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { useRouter } from "next/navigation"
import { GlassPanel } from "@/components/ui/GlassPanel"
import { AuraButton } from "@/components/ui/AuraButton"
import { ParticleBackground } from "@/components/ui/ParticleBackground"
import { ShieldCheck, Video, MessageSquare, HardDrive, LayoutDashboard, UserPlus, Server } from "lucide-react"

export default function LandingPage() {
  const router = useRouter()

  const features = [
    {
      icon: <Server className="w-6 h-6 text-cyan-400" />,
      title: "Secure Infrastructure",
      description: "Enterprise-ready signaling and robust architecture ensuring strict compliance and privacy-focused design."
    },
    {
      icon: <Video className="w-6 h-6 text-purple-400" />,
      title: "Real-Time Video",
      description: "Zero-install, browser-native HD video calling with adaptive bitrate degradation for low-bandwidth environments."
    },
    {
      icon: <MessageSquare className="w-6 h-6 text-pink-400" />,
      title: "Persistent Chat",
      description: "In-call text exchange with full session history retrieval and secure file-sharing capabilities."
    },
    {
      icon: <ShieldCheck className="w-6 h-6 text-amber-400" />,
      title: "Strict Role Access",
      description: "Enforced boundaries. Agents manage sessions and recordings; Customers join via secure, short-lived tokens."
    }
  ]

  return (
    <main className="min-h-screen w-screen overflow-x-hidden relative bg-black selection:bg-[var(--color-lumen-pure)] selection:text-black">
      {/* Immersive Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <ParticleBackground />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-cyan-900/20 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-purple-900/10 blur-[150px] rounded-full pointer-events-none" />
      </div>

      <div className="relative z-10 container mx-auto px-6 pt-32 pb-24">
        {/* Header / Hero */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="max-w-4xl mx-auto text-center space-y-8"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-[var(--color-lumen-pure)] animate-pulse" />
            <span className="text-xs font-medium tracking-widest text-white/70 uppercase">ATOMQUEST HACKATHON 1.0 GRAND FINALE</span>
          </div>

          <h1 className="text-6xl md:text-8xl font-heading text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-white/40 tracking-tight">
            Support Without <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">Blind Spots.</span>
          </h1>

          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
            A production-grade AI Support Command Center. Bridge the gap between agents and customers with live AI transcription, real-time sentiment analysis, automated ticket generation, and crystal-clear visual context.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-8">
            <AuraButton 
              variant="primary" 
              className="w-full sm:w-auto px-8 py-6 text-lg h-14"
              onClick={() => router.push("/dashboard")}
            >
              <LayoutDashboard className="w-5 h-5 mr-2" />
              Open Agent Dashboard
            </AuraButton>

            <AuraButton 
              variant="ghost" 
              className="w-full sm:w-auto px-8 py-6 text-lg h-14 border border-white/10 hover:bg-white/5"
              onClick={() => router.push("/join")}
            >
              <UserPlus className="w-5 h-5 mr-2" />
              Join as Customer
            </AuraButton>
          </div>
        </motion.div>

        {/* Features Grid */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          className="mt-32 grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto"
        >
          {features.map((feature, idx) => (
            <GlassPanel key={idx} className="p-8 hover:bg-white/[0.04] transition-colors group cursor-default">
              <div className="w-14 h-14 rounded-2xl bg-black/50 border border-white/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                {feature.icon}
              </div>
              <h3 className="text-xl font-heading text-white mb-3">{feature.title}</h3>
              <p className="text-gray-400 leading-relaxed text-sm">
                {feature.description}
              </p>
            </GlassPanel>
          ))}
        </motion.div>

        {/* Architecture Highlight */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
          className="mt-32 max-w-5xl mx-auto"
        >
          <GlassPanel className="p-1 relative overflow-hidden">
             <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-blue-500/10 opacity-50" />
             <div className="relative bg-black/80 backdrop-blur-xl p-10 md:p-16 rounded-[2rem] border border-white/5 flex flex-col md:flex-row items-center gap-12">
                <div className="flex-1 space-y-6">
                  <h2 className="text-3xl font-heading text-white">Enterprise Ready Architecture.</h2>
                  <p className="text-gray-400 leading-relaxed">
                    Built to scale securely, Lumen pairs real-time WebRTC streams with powerful background AI workers to transcribe, analyze, and structure customer interactions.
                  </p>
                  <ul className="space-y-3 text-sm text-gray-300">
                    <li className="flex items-center gap-3">
                      <HardDrive className="w-4 h-4 text-cyan-400" />
                      Server-Side Call Recording
                    </li>
                    <li className="flex items-center gap-3">
                      <ShieldCheck className="w-4 h-4 text-cyan-400" />
                      Strict Token-Based Authentication
                    </li>
                  </ul>
                </div>
                <div className="w-full md:w-1/2 aspect-video bg-gradient-to-br from-white/5 to-white/0 rounded-2xl border border-white/10 flex items-center justify-center">
                   <div className="text-white/20 font-mono text-sm text-center">
                     [ LiveKit SFU ]<br/>↓<br/>[ Next.js Edge ]<br/>↓<br/>[ OpenAI / BullMQ ]
                   </div>
                </div>
             </div>
          </GlassPanel>
        </motion.div>
        
      </div>
    </main>
  )
}
