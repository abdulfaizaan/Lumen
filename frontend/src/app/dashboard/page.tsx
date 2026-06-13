"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { GlassPanel } from "@/components/ui/GlassPanel"
import { AuraButton } from "@/components/ui/AuraButton"
import { DashboardSkeleton } from "@/components/ui/SkeletonLoader"
import { NoSessionsEmpty, CustomerNoSessions } from "@/components/ui/EmptyState"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import { Plus, Copy, CheckCircle2, Clock, Video, MessageSquare, HardDrive } from "lucide-react"
import { io } from "socket.io-client"

type Session = {
  id: string
  status: string
  agentId: string
  customerName: string | null
  joinToken: string
  meetingId: string
  passcode: string
  durationSeconds: number
  startedAt: string | null
  endedAt: string | null
  createdAt: string
  agent?: { id: string; name: string }
  customer?: { id: string; name: string }
  recordings?: { id: string; status: string }[]
  _count?: { messages: number; events: number }
}

function formatDuration(seconds: number): string {
  if (seconds <= 0) return "0:00"
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, "0")}`
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "Just now"
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export default function AgentDashboard() {
  const router = useRouter()
  const [sessions, setSessions] = useState<Session[]>([])
  const [isCreating, setIsCreating] = useState(false)
  const [copiedToken, setCopiedToken] = useState<string | null>(null)
  const [role, setRole] = useState<string>("AGENT")
  const [isLoading, setIsLoading] = useState(true)
  const [endConfirm, setEndConfirm] = useState<{ open: boolean; sessionId: string | null }>({ open: false, sessionId: null })
  const [isEnding, setIsEnding] = useState(false)

  // ── WebSocket connection for real-time updates ───────────────────────
  useEffect(() => {
    let socket: ReturnType<typeof io>

    // Initial fetch
    const fetchSessions = async () => {
      try {
        const res = await fetch("/api/sessions")
        if (res.ok) {
          const data = await res.json()
          setSessions(data.sessions || [])
          setRole(data.role || "AGENT")

          // Connect WebSocket after getting user context
          if (data.userId && (data.role === "AGENT" || data.role === "ADMIN")) {
            socket = io(window.location.origin, { path: "/ws" })
            socket.emit("join_agent_room", data.userId)

            socket.on("SESSION_CREATED", (newSession) => {
              setSessions(prev => [newSession, ...prev])
            })
            
            socket.on("SESSION_ENDED", ({ sessionId }) => {
              setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, status: "ENDED" } : s))
            })
          }
        }
      } catch (error) {
        console.error("Failed to fetch sessions", error)
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchSessions()

    return () => {
      if (socket) socket.disconnect()
    }
  }, [])

  const handleCreateSession = async () => {
    setIsCreating(true)
    try {
      const res = await fetch("/api/sessions", { method: "POST" })
      if (res.ok) {
        const newSession = await res.json()
        setSessions(prev => [newSession, ...prev])
      }
    } catch (error) {
      console.error("Error creating session", error)
    } finally {
      setIsCreating(false)
    }
  }

  const handleEndSession = async () => {
    if (!endConfirm.sessionId) return
    setIsEnding(true)
    try {
      await fetch(`/api/sessions/${endConfirm.sessionId}/end`, { method: "POST" })
      setSessions(prev => prev.map(s => 
        s.id === endConfirm.sessionId ? { ...s, status: "ENDED" } : s
      ))
    } catch (error) {
      console.error("Failed to end session", error)
    } finally {
      setIsEnding(false)
      setEndConfirm({ open: false, sessionId: null })
    }
  }

  const handleCopyInvite = (meetingId: string, passcode: string) => {
    const inviteText = `Join my Lumen Support Session.\nMeeting ID: ${meetingId}\nPasscode: ${passcode}\n\nJoin URL: ${window.location.origin}/join`
    navigator.clipboard.writeText(inviteText)
    setCopiedToken(meetingId)
    setTimeout(() => setCopiedToken(null), 2000)
  }

  const activeCount = sessions.filter(s => s.status === "ACTIVE" || s.status === "active").length
  const isAgent = role === "AGENT" || role === "ADMIN"

  return (
    <main className="min-h-screen bg-[var(--background)] bg-[radial-gradient(ellipse_at_top_right,_var(--color-lumen-surface),_transparent_50%)] p-4 sm:p-8">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-[var(--color-lumen-pure)] focus:text-black focus:px-4 focus:py-2 focus:rounded-lg">
        Skip to main content
      </a>
      
      <div id="main-content" className="max-w-7xl mx-auto space-y-8 sm:space-y-12">
        {/* Header */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-heading font-medium tracking-tight text-white flex items-center space-x-3">
              <span className="w-4 h-4 rounded-full bg-[var(--color-lumen-pure)] shadow-[0_0_20px_rgba(0,229,255,0.8)]" />
              <span>{isAgent ? "Command Center" : "My Sessions"}</span>
            </h1>
            <p className="text-gray-400 mt-2 ml-7 text-sm sm:text-base">
              System operational. {activeCount} active session{activeCount !== 1 ? "s" : ""}.
            </p>
          </div>
          
          <div className="flex gap-3 w-full sm:w-auto">
            <AuraButton 
              variant="secondary" 
              onClick={() => {
                window.location.href = "/api/auth/signout"
              }}
              className="flex-1 sm:flex-none"
              aria-label="Sign out"
            >
              Sign Out
            </AuraButton>
            
            {isAgent && (
              <AuraButton 
                variant="primary" 
                className="space-x-2 flex-1 sm:flex-none"
                onClick={handleCreateSession}
                disabled={isCreating}
                aria-label="Create new session"
              >
                <Plus className="w-4 h-4" />
                <span>{isCreating ? "Creating..." : "New Session"}</span>
              </AuraButton>
            )}
            
            {role === "CUSTOMER" && (
              <AuraButton 
                variant="primary" 
                onClick={() => router.push("/join")}
                className="flex-1 sm:flex-none"
                aria-label="Join a meeting"
              >
                <span>Join Meeting</span>
              </AuraButton>
            )}
          </div>
        </header>

        {/* Loading State */}
        {isLoading && <DashboardSkeleton />}

        {/* Empty State */}
        {!isLoading && sessions.length === 0 && (
          isAgent ? (
            <NoSessionsEmpty onCreateSession={handleCreateSession} />
          ) : (
            <CustomerNoSessions />
          )
        )}

        {/* Dashboard Grid */}
        {!isLoading && sessions.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Create New Card (Agent Only) */}
            {isAgent && (
              <GlassPanel 
                className="p-6 flex flex-col items-center justify-center text-center space-y-4 border-dashed border-[var(--color-lumen-border-strong)] opacity-60 hover:opacity-100 cursor-pointer min-h-[200px]"
                onClick={handleCreateSession}
                role="button"
                tabIndex={0}
                aria-label="Create new session"
                onKeyDown={(e) => { if (e.key === "Enter") handleCreateSession() }}
              >
                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
                  <Plus className="w-6 h-6 text-gray-400" />
                </div>
                <div>
                  <h3 className="font-heading text-lg text-white">Generate Invite</h3>
                  <p className="text-sm text-gray-400 mt-1">Create a secure link</p>
                </div>
              </GlassPanel>
            )}

            {sessions.map((session) => {
              const isActive = session.status === "ACTIVE" || session.status === "active"
              const isWaiting = session.status === "WAITING" || session.status === "waiting"
              const isEnded = session.status === "ENDED" || session.status === "ended"
              
              return (
                <GlassPanel key={session.id} className="p-5 sm:p-6 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-lg font-medium text-white mb-1 truncate">
                          {session.customerName || session.customer?.name || `Session ${session.id.substring(0, 6)}`}
                        </h3>
                        <span className={`inline-flex text-xs px-2 py-1 rounded-full border ${
                          isActive ? "bg-[var(--color-lumen-pure)]/10 text-[var(--color-lumen-pure)] border-[var(--color-lumen-pure)]/20" :
                          isWaiting ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                          "bg-gray-500/10 text-gray-400 border-gray-500/20"
                        }`}>
                          {session.status}
                        </span>
                      </div>
                    </div>

                    {/* Stats Row */}
                    <div className="flex flex-wrap gap-2 mb-4 text-xs text-gray-400">
                      {(session.durationSeconds > 0 || isActive) && (
                        <div className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded-md">
                          <Clock className="w-3 h-3" />
                          {isActive && session.startedAt
                            ? formatDuration(Math.floor((Date.now() - new Date(session.startedAt).getTime()) / 1000))
                            : formatDuration(session.durationSeconds)
                          }
                        </div>
                      )}
                      {session._count?.messages ? (
                        <div className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded-md">
                          <MessageSquare className="w-3 h-3" />
                          {session._count.messages}
                        </div>
                      ) : null}
                      {session.recordings && session.recordings.length > 0 && (
                        <div className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded-md">
                          <HardDrive className="w-3 h-3 text-red-400" />
                          {session.recordings.length}
                        </div>
                      )}
                      <div className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded-md">
                        {formatTimeAgo(session.createdAt)}
                      </div>
                    </div>

                    {/* Meeting Credentials */}
                    <div className="space-y-3 mb-4">
                      <div className="flex gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-gray-500 mb-1">Meeting ID</div>
                          <div className="font-mono text-sm text-white tracking-widest truncate">
                            {session.meetingId?.replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3')}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 mb-1">Passcode</div>
                          <div className="font-mono text-sm text-[var(--color-lumen-pure)]">
                            {session.passcode}
                          </div>
                        </div>
                      </div>
                      
                      {isAgent && !isEnded && (
                        <div className="pt-1">
                          <AuraButton 
                            variant="secondary" 
                            className="w-full text-xs py-2 h-auto"
                            onClick={() => handleCopyInvite(session.meetingId, session.passcode)}
                            aria-label={`Copy invitation for session ${session.id.substring(0, 6)}`}
                          >
                            {copiedToken === session.meetingId ? (
                              <><CheckCircle2 className="w-3 h-3 mr-1 text-[var(--color-lumen-success)]" /> Copied</>
                            ) : (
                              <><Copy className="w-3 h-3 mr-1" /> Copy Invitation</>
                            )}
                          </AuraButton>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-2">
                    {(isActive || isWaiting) && (
                      <AuraButton 
                        variant="ghost" 
                        className="w-full border border-white/10"
                        onClick={() => {
                          if (!isAgent) {
                            router.push(`/session/${session.joinToken}`)
                          } else {
                            router.push(`/session/${session.id}`)
                          }
                        }}
                        aria-label={`Join session ${session.id.substring(0, 6)}`}
                      >
                        <Video className="w-4 h-4 mr-2" />
                        {!isAgent ? "Rejoin" : "Join as Agent"}
                      </AuraButton>
                    )}
                    
                    {isEnded && (
                      <AuraButton 
                        variant="ghost" 
                        className="w-full border border-white/10"
                        onClick={() => router.push(`/session/${session.id}/history`)}
                        aria-label={`View session history for ${session.id.substring(0, 6)}`}
                      >
                        <MessageSquare className="w-4 h-4 mr-2" />
                        View History
                      </AuraButton>
                    )}

                    {isAgent && isActive && (
                      <AuraButton 
                        variant="danger" 
                        className="w-full text-xs py-2 h-auto"
                        onClick={() => setEndConfirm({ open: true, sessionId: session.id })}
                        aria-label={`End session ${session.id.substring(0, 6)}`}
                      >
                        End Session
                      </AuraButton>
                    )}
                  </div>
                </GlassPanel>
              )
            })}
          </div>
        )}
      </div>

      {/* End Session Confirmation Dialog */}
      <ConfirmDialog
        isOpen={endConfirm.open}
        onClose={() => setEndConfirm({ open: false, sessionId: null })}
        onConfirm={handleEndSession}
        title="End This Session?"
        description="This will immediately end the call for all participants. Chat history and recordings will be preserved."
        confirmLabel="End Session"
        variant="danger"
        isLoading={isEnding}
      />
    </main>
  )
}
