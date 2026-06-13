"use client"

import { useState, useEffect } from "react"
import { GlassPanel } from "@/components/ui/GlassPanel"
import { AuraButton } from "@/components/ui/AuraButton"
import { io } from "socket.io-client"
import { Users, Clock } from "lucide-react"
import { useSessionStore } from "@/store/useSessionStore"

type SupportRequest = {
  id: string
  customerName: string
  issueSummary: string
  priority: number
  status: string
  createdAt: string
}

export default function QueuePage() {
  const [requests, setRequests] = useState<SupportRequest[]>([])
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    let socket: ReturnType<typeof io>

    const init = async () => {
      // Get session
      const res = await fetch("/api/sessions")
      if (res.ok) {
        const data = await res.json()
        setUserId(data.userId)

        socket = io(window.location.origin, { path: "/ws" })
        socket.emit("join_agent_room", data.userId)

        socket.on("CUSTOMER_WAITING", (req: SupportRequest) => {
          setRequests(prev => [...prev, req])
        })

        socket.on("CUSTOMER_ASSIGNED", ({ requestId }) => {
          setRequests(prev => prev.filter(r => r.id !== requestId))
        })
      }

      // Initial fetch of queue
      const queueRes = await fetch("/api/queue")
      if (queueRes.ok) {
        const queueData = await queueRes.json()
        setRequests(queueData.requests || [])
      }
    }

    init()

    return () => {
      if (socket) socket.disconnect()
    }
  }, [])

  return (
    <main className="min-h-screen bg-[var(--background)] p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex items-center justify-between">
          <h1 className="text-3xl font-heading text-white flex items-center gap-3">
            <Users className="w-8 h-8 text-[var(--color-lumen-pure)]" />
            Support Queue
          </h1>
          <div className="flex gap-4 items-center">
            <div className="bg-white/5 px-4 py-2 rounded-full border border-white/10 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[var(--color-lumen-pure)] animate-pulse" />
              <span className="text-sm text-white">{requests.length} Waiting</span>
            </div>
            <AuraButton variant="secondary" onClick={() => window.location.href = "/dashboard"}>
              Dashboard
            </AuraButton>
          </div>
        </header>

        <div className="grid gap-4">
          {requests.length === 0 ? (
            <GlassPanel className="p-12 text-center text-gray-500">
              <Clock className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>The queue is empty. All customers are being helped.</p>
            </GlassPanel>
          ) : (
            requests.map(req => (
              <GlassPanel key={req.id} className="p-6 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-white mb-1">{req.customerName}</h3>
                  <p className="text-sm text-gray-400">{req.issueSummary}</p>
                  <div className="mt-2 text-xs text-amber-500 bg-amber-500/10 px-2 py-1 rounded-full inline-block">
                    Priority {req.priority}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="text-xs text-gray-500">
                    Waiting since {new Date(req.createdAt).toLocaleTimeString()}
                  </span>
                  <AuraButton 
                    variant="primary" 
                    onClick={async () => {
                      // Manual assignment fallback
                      await fetch(`/api/queue/${req.id}/assign`, { method: "POST" })
                    }}
                  >
                    Accept Request
                  </AuraButton>
                </div>
              </GlassPanel>
            ))
          )}
        </div>
      </div>
    </main>
  )
}
