"use client"

import React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { GlassPanel } from "@/components/ui/GlassPanel"
import { Sparkles, Brain, Gauge, BookOpen, ChevronRight } from "lucide-react"
import { io } from "socket.io-client"

export function AIAssistantSidebar({ 
  sessionId, 
  isOpen, 
  onClose 
}: { 
  sessionId: string;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [sentiment, setSentiment] = React.useState<{ frustrationLevel: string, score: number }>({
    frustrationLevel: "LOW",
    score: 0.1
  })
  const [recommendations, setRecommendations] = React.useState<{ id: string, text: string }[]>([])
  const [isProcessing, setIsProcessing] = React.useState(false)

  React.useEffect(() => {
    if (!isOpen) return;

    let socket: ReturnType<typeof io>

    const init = async () => {
      socket = io(window.location.origin, { path: "/ws" })
      // Agents listen to the session room or agent room
      socket.emit("join_session_room", sessionId)

      socket.on("AI_SENTIMENT_UPDATE", (data) => {
        setSentiment(data)
      })

      socket.on("AI_AGENT_ASSIST", (data) => {
        setIsProcessing(false)
        setRecommendations(prev => {
          // Keep last 3 recommendations
          const newRecs = [{ id: Date.now().toString(), text: data.recommendation }, ...prev]
          return newRecs.slice(0, 3)
        })
      })

      socket.on("TRANSCRIPT_RECEIVED", () => {
        // Show subtle processing animation when speaking
        setIsProcessing(true)
        setTimeout(() => setIsProcessing(false), 2000)
      })
    }
    init()

    return () => {
      if (socket) socket.disconnect()
    }
  }, [sessionId, isOpen])

  const getSentimentColor = () => {
    if (sentiment.frustrationLevel === "HIGH") return "text-red-500 bg-red-500/10 border-red-500/20"
    if (sentiment.frustrationLevel === "MEDIUM") return "text-amber-500 bg-amber-500/10 border-amber-500/20"
    return "text-emerald-500 bg-emerald-500/10 border-emerald-500/20"
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: "100%", opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: "100%", opacity: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="flex-shrink-0 fixed inset-0 sm:relative sm:inset-auto z-40 sm:z-30 flex sm:block justify-end bg-black/60 sm:bg-transparent"
        >
          <div className="absolute inset-0 sm:hidden" onClick={onClose} />
          <div className="relative h-full py-0 sm:py-6 pr-0 sm:pr-6 w-[85%] max-w-[380px] sm:w-[380px]">
            <GlassPanel className="h-full w-full flex flex-col relative rounded-2xl sm:rounded-3xl border border-white/5 bg-white/[0.02]">
              <div className="p-4 sm:p-6 border-b border-white/5 flex justify-between items-center bg-gradient-to-r from-amber-500/10 to-transparent">
                <h2 className="font-heading text-lg text-amber-400 flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  AI Command Center
                </h2>
                <button onClick={onClose} className="text-gray-400 hover:text-white p-1 sm:hidden">
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 flex flex-col">
                
                {/* Live Sentiment Module */}
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                    <Gauge className="w-4 h-4" />
                    Live Sentiment
                  </h3>
                  <div className={`p-4 rounded-xl border flex items-center justify-between ${getSentimentColor()} transition-colors duration-500`}>
                    <div>
                      <div className="text-sm font-medium">Frustration Risk</div>
                      <div className="text-2xl font-heading mt-1">{sentiment.frustrationLevel}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs opacity-70">Score</div>
                      <div className="text-xl font-mono">{(sentiment.score * 100).toFixed(0)}%</div>
                    </div>
                  </div>
                </div>

                {/* Agent Assist Recommendations */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                      <Brain className="w-4 h-4" />
                      Copilot Assist
                    </h3>
                    {isProcessing && (
                      <span className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                      </span>
                    )}
                  </div>
                  
                  <div className="space-y-3">
                    {recommendations.length === 0 ? (
                      <div className="p-4 border border-dashed border-white/10 rounded-xl text-center text-xs text-gray-500">
                        Listening to conversation to provide context-aware suggestions...
                      </div>
                    ) : (
                      recommendations.map(rec => (
                        <motion.div 
                          key={rec.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-4 bg-white/5 border border-white/10 rounded-xl text-sm text-gray-300 leading-relaxed"
                        >
                          {rec.text}
                        </motion.div>
                      ))
                    )}
                  </div>
                </div>

                {/* Knowledge Base Quick Search placeholder */}
                <div className="space-y-3 pt-4 border-t border-white/5">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    Knowledge Base
                  </h3>
                  <input 
                    type="text" 
                    placeholder="Ask the AI about documentation..."
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-amber-500/50"
                  />
                </div>

              </div>
            </GlassPanel>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
