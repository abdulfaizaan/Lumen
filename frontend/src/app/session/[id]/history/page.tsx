"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { GlassPanel } from "@/components/ui/GlassPanel"
import { AuraButton } from "@/components/ui/AuraButton"
import { SessionDetailSkeleton } from "@/components/ui/SkeletonLoader"
import { ArrowLeft, Clock, MessageSquare, Download, FileText, HardDrive, Calendar, ListFilter, Video, Sparkles, Star, AlertCircle } from "lucide-react"

export default function SessionHistoryPage() {
  const params = useParams()
  const router = useRouter()
  const [session, setSession] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [aiSummary, setAiSummary] = useState<any>(null)
  const [isGeneratingAi, setIsGeneratingAi] = useState(false)

  const generateAiSummary = async () => {
    setIsGeneratingAi(true)
    try {
      const res = await fetch('/api/ai/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: params.id })
      })
      if (res.ok) {
        const data = await res.json()
        setAiSummary(data)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setIsGeneratingAi(false)
    }
  }

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const res = await fetch(`/api/sessions/${params.id}`)
        if (res.ok) {
          const data = await res.json()
          setSession(data)
        } else {
          setError("Failed to load session details")
        }
      } catch (err) {
        setError("Error loading data")
      } finally {
        setIsLoading(false)
      }
    }
    fetchDetails()
  }, [params.id])

  if (isLoading) return <main className="min-h-screen bg-black p-4 sm:p-8"><SessionDetailSkeleton /></main>
  if (error || !session) return <main className="min-h-screen bg-black text-white flex items-center justify-center p-8">{error}</main>

  const isAgentOrAdmin = session.currentUserRole === "AGENT" || session.currentUserRole === "ADMIN"

  return (
    <main className="min-h-screen bg-[var(--background)] bg-[radial-gradient(ellipse_at_top_right,_var(--color-lumen-surface),_transparent_50%)] p-4 sm:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <button onClick={() => router.back()} className="p-2 -ml-2 text-gray-400 hover:text-white transition-colors rounded-full hover:bg-white/5">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-3xl sm:text-4xl font-heading font-medium tracking-tight text-white flex items-center gap-3">
                <span>Session History</span>
              </h1>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-400 ml-10">
              <span>{session.customer?.name || "Anonymous Customer"}</span>
              <span className="w-1 h-1 rounded-full bg-white/20" />
              <Calendar className="w-4 h-4" />
              <span>{new Date(session.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <span className={`inline-flex px-3 py-1.5 rounded-full text-xs font-medium border ${
              session.status === "ACTIVE" ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" :
              session.status === "WAITING" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
              "bg-gray-500/10 text-gray-400 border-gray-500/20"
            }`}>
              {session.status}
            </span>
          </div>
        </header>

        {/* Overview Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <GlassPanel className="p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
              <Clock className="w-5 h-5 text-[var(--color-lumen-pure)]" />
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Duration</p>
              <p className="text-lg font-heading text-white">{Math.floor(session.durationSeconds / 60)}m {session.durationSeconds % 60}s</p>
            </div>
          </GlassPanel>
          <GlassPanel className="p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Messages</p>
              <p className="text-lg font-heading text-white">{session.messages?.length || 0}</p>
            </div>
          </GlassPanel>
          <GlassPanel className="p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
              <HardDrive className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Recordings</p>
              <p className="text-lg font-heading text-white">{session.recordings?.length || 0}</p>
            </div>
          </GlassPanel>
          <GlassPanel className="p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
              <FileText className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Files Shared</p>
              <p className="text-lg font-heading text-white">{session.attachments?.length || 0}</p>
            </div>
          </GlassPanel>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Column */}
          <div className="lg:col-span-2 space-y-8">
            {/* AI Summary Section (Agent/Admin Only) */}
            {isAgentOrAdmin && (
              <GlassPanel className="p-6 relative overflow-hidden border-amber-500/20">
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent pointer-events-none" />
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
                    <div className="flex items-center gap-2 text-amber-400">
                      <Sparkles className="w-5 h-5" />
                      <h2 className="text-lg font-heading">AI Session Summary</h2>
                    </div>
                    {!aiSummary && (
                      <AuraButton 
                        onClick={generateAiSummary} 
                        disabled={isGeneratingAi}
                        className="px-4 py-2 text-xs"
                      >
                        {isGeneratingAi ? "Generating..." : "Generate Summary & Ticket"}
                      </AuraButton>
                    )}
                  </div>
                  
                  {aiSummary ? (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="bg-black/40 border border-white/5 p-4 rounded-xl">
                          <p className="text-xs text-gray-500 mb-2">Problem Identified</p>
                          <p className="text-sm text-gray-300">{aiSummary.problemIdentified}</p>
                        </div>
                        <div className="bg-black/40 border border-white/5 p-4 rounded-xl">
                          <p className="text-xs text-gray-500 mb-2">Resolution</p>
                          <p className="text-sm text-gray-300">{aiSummary.resolution}</p>
                        </div>
                      </div>
                      <div className="bg-black/40 border border-white/5 p-4 rounded-xl">
                        <p className="text-xs text-gray-500 mb-2">Action Items</p>
                        <ul className="list-disc list-inside text-sm text-gray-300 space-y-1">
                          {aiSummary.actionItems?.map((item: string, i: number) => <li key={i}>{item}</li>)}
                        </ul>
                      </div>
                      <div className="bg-[#0a0a0a] border border-[var(--color-lumen-pure)]/30 p-4 rounded-xl">
                        <div className="flex items-center gap-2 mb-3">
                          <AlertCircle className="w-4 h-4 text-cyan-400" />
                          <p className="text-sm font-medium text-cyan-400">Generated Support Ticket</p>
                        </div>
                        <div className="space-y-2 text-sm text-gray-300">
                          <p><span className="text-gray-500">Title:</span> {aiSummary.ticket?.title}</p>
                          <p><span className="text-gray-500">Category:</span> {aiSummary.ticket?.category}</p>
                          <p><span className="text-gray-500">Severity:</span> {aiSummary.ticket?.severity}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Sparkles className="w-8 h-8 opacity-20 mx-auto mb-3" />
                      <p className="text-sm">Click generate to analyze the transcript and agent notes.</p>
                    </div>
                  )}
                </div>
              </GlassPanel>
            )}
            {/* Chat Transcript */}
            <GlassPanel className="p-6 h-[500px] flex flex-col">
              <div className="flex items-center gap-2 mb-6 pb-4 border-b border-white/5">
                <MessageSquare className="w-5 h-5 text-gray-400" />
                <h2 className="text-lg font-heading text-white">Chat Transcript</h2>
              </div>
              <div className="flex-1 overflow-y-auto space-y-4 pr-4">
                {(!session.messages || session.messages.length === 0) ? (
                  <p className="text-gray-500 italic text-center mt-10">No messages in this session.</p>
                ) : (
                  session.messages.map((msg: any) => (
                    <div key={msg.id} className="flex flex-col gap-1 items-start">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-[var(--color-lumen-pure)]">{msg.sender?.name || 'User'}</span>
                        <span className="text-[10px] text-gray-600">{new Date(msg.createdAt).toLocaleTimeString()}</span>
                      </div>
                      <div className="bg-white/5 border border-white/10 px-4 py-3 rounded-2xl rounded-tl-none max-w-[85%] text-sm text-gray-200">
                        {msg.content}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </GlassPanel>

            {/* Event Timeline */}
            <GlassPanel className="p-6">
              <div className="flex items-center gap-2 mb-6 pb-4 border-b border-white/5">
                <ListFilter className="w-5 h-5 text-gray-400" />
                <h2 className="text-lg font-heading text-white">Session Timeline</h2>
              </div>
              <div className="space-y-6">
                {(!session.events || session.events.length === 0) ? (
                  <p className="text-gray-500 italic text-center">No timeline events recorded.</p>
                ) : (
                  <div className="relative border-l border-white/10 ml-3 space-y-6 pl-6 pb-2">
                    {session.events.map((event: any) => (
                      <div key={event.id} className="relative">
                        <div className="absolute -left-[29px] mt-1 w-2 h-2 rounded-full bg-[var(--color-lumen-pure)] shadow-[0_0_8px_rgba(0,229,255,0.5)]" />
                        <div className="flex items-baseline gap-2 mb-1">
                          <span className="text-sm font-medium text-white">{event.eventType.replace(/_/g, ' ')}</span>
                          <span className="text-xs text-gray-500">{new Date(event.timestamp).toLocaleTimeString()}</span>
                        </div>
                        {event.user?.name && <p className="text-sm text-gray-400">{event.user.name}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </GlassPanel>
          </div>

          {/* Right Column */}
          <div className="space-y-8">
            {/* CSAT Score (If available) */}
            {session.csatScore && (
              <GlassPanel className="p-6">
                <div className="flex items-center gap-2 mb-6 pb-4 border-b border-white/5">
                  <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                  <h2 className="text-lg font-heading text-white">Customer Feedback</h2>
                </div>
                <div className="flex items-center gap-1 mb-3">
                  {[1, 2, 3, 4, 5].map(star => (
                    <Star key={star} className={`w-6 h-6 ${star <= session.csatScore ? "text-amber-400 fill-amber-400" : "text-gray-700"}`} />
                  ))}
                  <span className="ml-2 font-medium text-white">{session.csatScore}/5</span>
                </div>
                {session.csatFeedback && (
                  <div className="bg-white/5 border border-white/5 p-4 rounded-xl text-sm text-gray-300 italic">
                    "{session.csatFeedback}"
                  </div>
                )}
              </GlassPanel>
            )}

            {/* Agent Notes (Only visible to Agent/Admin) */}
            {isAgentOrAdmin && (
              <GlassPanel className="p-6">
                <div className="flex items-center gap-2 mb-6 pb-4 border-b border-white/5">
                  <FileText className="w-5 h-5 text-amber-400" />
                  <h2 className="text-lg font-heading text-white">Agent Notes</h2>
                </div>
                <div className="text-sm text-gray-300 whitespace-pre-wrap">
                  {session.notes || <span className="text-gray-600 italic">No notes were taken during this session.</span>}
                </div>
              </GlassPanel>
            )}

            {/* Recordings */}
            <GlassPanel className="p-6">
              <div className="flex items-center gap-2 mb-6 pb-4 border-b border-white/5">
                <HardDrive className="w-5 h-5 text-red-400" />
                <h2 className="text-lg font-heading text-white">Recordings</h2>
              </div>
              <div className="space-y-3">
                {(!session.recordings || session.recordings.length === 0) ? (
                  <p className="text-gray-500 italic text-sm">No recordings available.</p>
                ) : (
                  session.recordings.map((rec: any, idx: number) => (
                    <div key={rec.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                      <div className="flex items-center gap-3">
                        <Video className="w-4 h-4 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-white">Recording {idx + 1}</p>
                          <p className="text-xs text-gray-500">{rec.duration}s</p>
                        </div>
                      </div>
                      {rec.status === "ready" && rec.fileUrl ? (
                        <AuraButton variant="secondary" size="icon" onClick={() => window.open(rec.fileUrl, "_blank")}>
                          <Download className="w-4 h-4 text-cyan-400" />
                        </AuraButton>
                      ) : (
                        <span className="text-xs text-amber-400 px-2 py-1 bg-amber-500/10 rounded-full">{rec.status}</span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </GlassPanel>

            {/* Attachments */}
            <GlassPanel className="p-6">
              <div className="flex items-center gap-2 mb-6 pb-4 border-b border-white/5">
                <FileText className="w-5 h-5 text-cyan-400" />
                <h2 className="text-lg font-heading text-white">Files Shared</h2>
              </div>
              <div className="space-y-3">
                {(!session.attachments || session.attachments.length === 0) ? (
                  <p className="text-gray-500 italic text-sm">No files were shared.</p>
                ) : (
                  session.attachments.map((file: any) => (
                    <div key={file.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                      <div className="flex flex-col max-w-[75%]">
                        <p className="text-sm font-medium text-white truncate">{file.fileName}</p>
                        <p className="text-xs text-gray-500">{(file.fileSize / 1024).toFixed(1)} KB • {file.sender?.name}</p>
                      </div>
                      <AuraButton variant="secondary" size="icon" onClick={() => window.open(file.fileUrl, "_blank")}>
                        <Download className="w-4 h-4 text-cyan-400" />
                      </AuraButton>
                    </div>
                  ))
                )}
              </div>
            </GlassPanel>
          </div>
        </div>
      </div>
    </main>
  )
}
