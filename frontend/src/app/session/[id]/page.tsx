"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { GlassPanel } from "@/components/ui/GlassPanel"
import { AuraButton } from "@/components/ui/AuraButton"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import { AIAssistantSidebar } from "./AIAssistantSidebar"
import {
  Mic, MicOff, Video as VideoIcon, VideoOff, PhoneOff, MessageSquare, MonitorUp,
  Send, AlertCircle, FileText, Circle, Upload, Paperclip, Download, WifiOff, X,
  Sparkles, Activity
} from "lucide-react"
import { useSessionStore } from "@/store/useSessionStore"
import {
  LiveKitRoom,
  VideoTrack,
  useTracks,
  RoomAudioRenderer,
  useLocalParticipant,
  useConnectionQualityIndicator,
  useRoomContext,
} from "@livekit/components-react"
import { Track, VideoPresets, RoomOptions, ConnectionQuality, RoomEvent, DataPacket_Kind } from "livekit-client"

// ─── Types ───────────────────────────────────────────────────────
interface ChatMsg {
  id: string
  senderId: string
  senderRole: string
  content: string
  createdAt: string
  sender?: { id: string; name: string; role: string }
  isLocal?: boolean
}

// ─── Main Room Content ───────────────────────────────────────────
function GlassRoomContent({ isAgent, sessionId }: { isAgent: boolean; sessionId: string }) {
  const router = useRouter()
  const room = useRoomContext()
  const {
    isLocalMuted, isLocalVideoOff, isChatOpen,
    toggleLocalMute, toggleLocalVideo, toggleChat
  } = useSessionStore()

  const { localParticipant } = useLocalParticipant()
  
  const screenShareTracks = useTracks(
    [{ source: Track.Source.ScreenShare, withPlaceholder: false }],
    { onlySubscribed: false }
  )
  const isScreenSharing = screenShareTracks.some(
    (t) => t.participant.isLocal && t.source === Track.Source.ScreenShare
  )
  const isSomeoneElseSharing = screenShareTracks.some(
    (t) => !t.participant.isLocal && t.source === Track.Source.ScreenShare
  )

  const [isEndConfirmOpen, setIsEndConfirmOpen] = React.useState(false)
  const [isEnding, setIsEnding] = React.useState(false)
  const [isNotesOpen, setIsNotesOpen] = React.useState(false)
  const [isRecording, setIsRecording] = React.useState(false)
  const [recordingId, setRecordingId] = React.useState<string | null>(null)
  const [isAssistantOpen, setIsAssistantOpen] = React.useState(false)
  const [caption, setCaption] = React.useState<{ text: string; id: string } | null>(null)

  // AI Transcription Handler
  React.useEffect(() => {
    if (!room) return

    const handleTranscription = async (segments: any[]) => {
      for (const segment of segments) {
        if (segment.text && segment.text.trim().length > 0) {
          
          setCaption({ text: `${segment.participantIdentity}: ${segment.text}`, id: segment.id });
          setTimeout(() => {
            setCaption(prev => prev?.id === segment.id ? null : prev);
          }, 4000);
          try {
            await fetch(`/api/sessions/${sessionId}/transcripts`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                participantIdentity: segment.participantIdentity,
                participantName: segment.participantIdentity,
                text: segment.text,
                isFinal: segment.final
              })
            })
          } catch (e) {
            console.error("Failed to POST transcript", e)
          }
        }
      }
    }

    room.on(RoomEvent.TranscriptionReceived, handleTranscription)
    return () => {
      room.off(RoomEvent.TranscriptionReceived, handleTranscription)
    }
  }, [room, sessionId])

  // Quality indicator moved to a sub-component

  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      await localParticipant?.setScreenShareEnabled(false)
      return
    }
    if (isSomeoneElseSharing) return
    const consent = window.confirm("Are you sure you want to share your screen?")
    if (consent && localParticipant) {
      await localParticipant.setScreenShareEnabled(true)
    }
  }

  const handleEndCall = async () => {
    if (isAgent) {
      setIsEnding(true)
      try {
        if (isRecording) {
          await fetch(`/api/sessions/${sessionId}/recording`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "stop" }),
          })
        }
        await fetch(`/api/sessions/${sessionId}/end`, { method: "POST" })
      } catch (err) {
        console.error("Failed to end session:", err)
      }
    }
    try {
      await fetch(`/api/sessions/${sessionId}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventType: "PARTICIPANT_LEFT" }),
      })
    } catch {}
    router.push(isAgent ? "/dashboard" : `/session/${sessionId}/csat`)
  }

  const handleToggleRecording = async () => {
    try {
      const res = await fetch(`/api/sessions/${sessionId}/recording`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: isRecording ? "stop" : "start" }),
      })
      if (res.ok) {
        const data = await res.json()
        setIsRecording(!isRecording)
        if (!isRecording) setRecordingId(data.id)
        else setRecordingId(null)
      }
    } catch (err) {
      console.error("Recording error:", err)
    }
  }

  React.useEffect(() => {
    if (localParticipant) {
      localParticipant.setMicrophoneEnabled(!isLocalMuted)
    }
  }, [isLocalMuted, localParticipant])

  const containerRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (localParticipant) {
      localParticipant.setCameraEnabled(!isLocalVideoOff)
    }
  }, [isLocalVideoOff, localParticipant])

  return (
    <main className="h-screen w-screen overflow-hidden bg-black relative flex flex-col sm:flex-row">
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-900/20 via-black to-blue-900/20 blur-3xl z-0 pointer-events-none" />

      {/* Main Video Area */}
      <motion.div layout className="relative flex-1 p-3 sm:p-6 flex flex-col gap-3 sm:gap-6 z-10 w-full">
        <div ref={containerRef} className="flex-1 rounded-2xl sm:rounded-3xl overflow-hidden relative bg-[#0a0a0a] border border-white/5 flex items-center justify-center">
          <CustomerVideoFeed />
          <RoomAudioRenderer />
          
          {/* Top Info Bar */}
          <div className="absolute top-3 sm:top-6 left-3 sm:left-6 right-3 sm:right-6 flex justify-between items-start z-20">
            <GlassPanel className="px-3 py-1.5 sm:px-4 sm:py-2 flex items-center gap-2 sm:gap-3 rounded-full">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-lumen-pure)] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--color-lumen-pure)]" />
              </span>
              <span className="text-xs sm:text-sm font-medium">Live</span>
            </GlassPanel>
            
            <div className="flex items-center gap-2">
              <NetworkQualityIndicator />
              {isRecording && (
                <GlassPanel className="px-3 py-1.5 sm:px-4 sm:py-2 flex items-center gap-2 rounded-full">
                  <Circle className="w-3 h-3 text-red-500 fill-red-500 animate-pulse" />
                  <span className="text-xs text-red-400 font-medium">REC</span>
                </GlassPanel>
              )}
              <GlassPanel className="px-3 py-1.5 sm:px-4 sm:py-2 flex items-center gap-2 rounded-full text-xs text-gray-300">
                <span>Secure</span>
                <span className="w-1 h-1 rounded-full bg-white/20" />
                <span>WebRTC</span>
              </GlassPanel>
            </div>
          </div>

          {/* Live Closed Captions */}
          <AnimatePresence>
            {caption && (
              <motion.div 
                key={caption.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute bottom-24 sm:bottom-32 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-md px-6 py-3 rounded-full text-white/90 text-sm sm:text-base font-medium max-w-[80%] text-center z-40 border border-white/10 shadow-lg"
              >
                {caption.text}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Self View Overlay */}
          <motion.div 
            drag
            dragConstraints={containerRef}
            className="absolute bottom-3 sm:bottom-6 right-3 sm:right-6 w-32 h-48 sm:w-48 sm:h-72 rounded-xl sm:rounded-2xl bg-black border border-white/10 overflow-hidden shadow-2xl cursor-grab active:cursor-grabbing z-30 flex items-center justify-center"
          >
            {isLocalVideoOff ? (
              <div className="text-white/20 text-sm font-heading flex flex-col items-center gap-2">
                <VideoOff className="w-6 h-6 opacity-50 text-amber-500" />
                <span className="text-amber-500/50 text-xs">CAMERA OFF</span>
              </div>
            ) : (
              <LocalVideoFeed />
            )}
          </motion.div>
        </div>

        {/* Bottom Control Dock */}
        <div className="h-16 sm:h-20 flex items-center justify-center relative z-20 w-full max-w-full">
          <GlassPanel className="h-full px-3 sm:px-6 flex items-center gap-2 sm:gap-4 rounded-2xl sm:rounded-[2rem] overflow-x-auto overflow-y-hidden max-w-[95vw] scrollbar-hide">
            <AuraButton variant={isLocalMuted ? "secondary" : "ghost"} size="icon" onClick={toggleLocalMute}
              className={isLocalMuted ? "text-amber-400 border-amber-400/50" : ""} aria-label={isLocalMuted ? "Unmute microphone" : "Mute microphone"}>
              {isLocalMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </AuraButton>
            
            <AuraButton variant={isLocalVideoOff ? "secondary" : "ghost"} size="icon" onClick={toggleLocalVideo}
              className={isLocalVideoOff ? "text-amber-400 border-amber-400/50" : ""} aria-label={isLocalVideoOff ? "Turn on camera" : "Turn off camera"}>
              {isLocalVideoOff ? <VideoOff className="w-5 h-5" /> : <VideoIcon className="w-5 h-5" />}
            </AuraButton>
            
            <div className="w-px h-8 bg-white/10 mx-1 hidden sm:block" />
            
            <AuraButton variant={isChatOpen ? "secondary" : "ghost"} size="icon" onClick={toggleChat}
              className={isChatOpen ? "bg-white/10" : ""} aria-label="Toggle chat">
              <MessageSquare className="w-5 h-5" />
            </AuraButton>

            <AuraButton variant={isScreenSharing ? "secondary" : "ghost"} size="icon" onClick={toggleScreenShare}
              disabled={isSomeoneElseSharing && !isScreenSharing} aria-label="Share screen"
              className={isScreenSharing ? "text-cyan-400 border-cyan-400/50 bg-white/10" : isSomeoneElseSharing ? "opacity-50 cursor-not-allowed" : ""}>
              <MonitorUp className="w-5 h-5" />
            </AuraButton>

            {isAgent && (
              <>
                <div className="w-px h-8 bg-white/10 mx-1 hidden sm:block" />
                <AuraButton variant={isRecording ? "danger" : "ghost"} size="icon" onClick={handleToggleRecording}
                  aria-label={isRecording ? "Stop recording" : "Start recording"}
                  className={isRecording ? "animate-pulse" : ""}>
                  <Circle className={`w-5 h-5 ${isRecording ? "fill-red-500 text-red-500" : ""}`} />
                </AuraButton>
                <AuraButton variant={isNotesOpen ? "secondary" : "ghost"} size="icon"
                  onClick={() => setIsNotesOpen(!isNotesOpen)} className={isNotesOpen ? "bg-white/10" : ""}
                  aria-label="Agent notes">
                  <FileText className="w-5 h-5" />
                </AuraButton>
                <AuraButton variant={isAssistantOpen ? "secondary" : "ghost"} size="icon"
                  onClick={() => setIsAssistantOpen(!isAssistantOpen)} className={isAssistantOpen ? "bg-white/10" : ""}
                  aria-label="AI Assistant">
                  <Sparkles className="w-5 h-5 text-amber-400" />
                </AuraButton>
              </>
            )}
            
            <div className="w-px h-8 bg-white/10 mx-1 hidden sm:block" />

            <AuraButton variant="danger" className="px-4 sm:px-8 rounded-full shadow-[0_0_20px_rgba(251,113,133,0.2)]"
              onClick={() => isAgent ? setIsEndConfirmOpen(true) : handleEndCall()} aria-label="End call">
              <PhoneOff className="w-5 h-5 sm:mr-2" />
              <span className="hidden sm:inline">End</span>
            </AuraButton>
          </GlassPanel>
        </div>
      </motion.div>

      {/* Sidebars */}
      <PersistentChatSidebar sessionId={sessionId} />
      {isAgent && (
        <AIAssistantSidebar 
          sessionId={sessionId}
          isOpen={isAssistantOpen}
          onClose={() => setIsAssistantOpen(false)}
        />
      )}
      
      {/* Agent Scratchpad */}
      <AgentScratchpad isOpen={isNotesOpen} sessionId={sessionId} />


      {/* End Session Confirmation */}
      <ConfirmDialog
        isOpen={isEndConfirmOpen}
        onClose={() => setIsEndConfirmOpen(false)}
        onConfirm={handleEndCall}
        title="End This Session?"
        description="This will end the call for all participants. Chat history and recordings will be preserved."
        confirmLabel="End Session"
        variant="danger"
        isLoading={isEnding}
      />
    </main>
  )
}

// ─── Persistent Chat Sidebar ─────────────────────────────────────
function PersistentChatSidebar({ sessionId }: { sessionId: string }) {
  const { isChatOpen } = useSessionStore()
  const [messages, setMessages] = React.useState<ChatMsg[]>([])
  const [messageText, setMessageText] = React.useState("")
  const [isSending, setIsSending] = React.useState(false)
  const [isUploading, setIsUploading] = React.useState(false)
  const chatContainerRef = React.useRef<HTMLDivElement>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  
  const room = useRoomContext()

  // Load existing messages on mount
  React.useEffect(() => {
    const loadMessages = async () => {
      try {
        const res = await fetch(`/api/sessions/${sessionId}/messages`)
        if (res.ok) {
          const data = await res.json()
          setMessages(data.messages || [])
        }
      } catch {}
    }
    loadMessages()
  }, [sessionId])

  // Listen for LiveKit Data Channel messages
  React.useEffect(() => {
    if (!room) return

    const handleData = (payload: Uint8Array, participant?: any) => {
      try {
        const str = new TextDecoder().decode(payload)
        const msgData = JSON.parse(str)
        if (msgData.type === "chat") {
          setMessages((prev) => [...prev, msgData.data])
        }
      } catch (e) {
        console.error("Failed to parse incoming data message", e)
      }
    }

    room.on(RoomEvent.DataReceived, handleData)
    return () => {
      room.off(RoomEvent.DataReceived, handleData)
    }
  }, [room])

  React.useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [messages])

  const handleSendMessage = async () => {
    if (!messageText.trim() || isSending) return
    setIsSending(true)
    try {
      const res = await fetch(`/api/sessions/${sessionId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: messageText.trim() }),
      })
      if (res.ok) {
        const msg = await res.json()
        const fullMsg = { ...msg, isLocal: true }
        
        // Optimistic UI
        setMessages((prev) => [...prev, fullMsg])
        setMessageText("")
        
        // Broadcast via LiveKit Data Channel
        if (room && room.localParticipant) {
          const payload = JSON.stringify({ type: "chat", data: { ...msg, isLocal: false } })
          const data = new TextEncoder().encode(payload)
          await room.localParticipant.publishData(data, { reliable: true })
        }
      }
    } catch (e) {
      console.error(e)
    } finally {
      setIsSending(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const res = await fetch(`/api/sessions/${sessionId}/attachments`, {
        method: "POST",
        body: formData,
      })
      if (res.ok) {
        const attachment = await res.json()
        // Add a system message about the file
        await fetch(`/api/sessions/${sessionId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: `📎 Shared file: ${attachment.fileName}`,
          }),
        })
      }
    } catch (e) {
      console.error("File upload failed:", e)
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  return (
    <AnimatePresence>
      {isChatOpen && (
        <motion.div
          initial={{ x: "100%", opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: "100%", opacity: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="flex-shrink-0 fixed inset-0 sm:relative sm:inset-auto z-40 sm:z-30 flex sm:block justify-end bg-black/60 sm:bg-transparent"
        >
          <div className="absolute inset-0 sm:hidden" onClick={() => {
            const toggleBtn = document.querySelector('[aria-label="Toggle chat"]') as HTMLButtonElement;
            if (toggleBtn) toggleBtn.click();
          }} />
          <div className="relative h-full py-0 sm:py-6 pr-0 sm:pr-6 w-[85%] max-w-[380px] sm:w-[380px]">
            <GlassPanel className="h-full w-full flex flex-col relative rounded-2xl sm:rounded-3xl border border-white/5 bg-white/[0.02]">
              <div className="p-4 sm:p-6 border-b border-white/5 flex justify-between items-center">
                <h2 className="font-heading text-lg text-white">Session Chat</h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const toggleBtn = document.querySelector('[aria-label="Toggle chat"]') as HTMLButtonElement;
                      if (toggleBtn) toggleBtn.click();
                    }}
                    className="text-gray-400 hover:text-white p-1 sm:hidden mr-1"
                    aria-label="Close chat"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="text-gray-400 hover:text-[var(--color-lumen-pure)] transition-colors p-1"
                    aria-label="Upload file"
                  >
                    {isUploading ? (
                      <div className="w-4 h-4 border-2 border-gray-400 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Paperclip className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.png,.jpg,.jpeg,.docx"
                  onChange={handleFileUpload}
                />
              </div>
              
              <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 flex flex-col">
                <div className="text-center text-xs text-gray-500 mb-auto mt-4">
                  Session started. Messages are saved.
                </div>
                {messages.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-sm text-gray-500 italic">
                    Start the conversation.
                  </div>
                ) : (
                  messages.map((msg, idx) => {
                    const isLocal = msg.isLocal || msg.senderRole === "AGENT"
                    return (
                      <div key={msg.id || idx} className={`flex flex-col gap-1 ${isLocal ? "items-end" : "items-start"}`}>
                        <span className={`text-xs text-gray-500 ${isLocal ? "mr-1" : "ml-1"}`}>
                          {msg.sender?.name || (isLocal ? "You" : "Participant")}
                        </span>
                        <div className={
                          isLocal 
                            ? "bg-[var(--color-lumen-pure)]/10 border border-[var(--color-lumen-pure)]/20 px-4 py-3 rounded-2xl rounded-tr-none max-w-[85%] text-sm text-[var(--color-lumen-pure)]"
                            : "bg-white/5 border border-white/10 px-4 py-3 rounded-2xl rounded-tl-none max-w-[85%] text-sm text-gray-200"
                        }>
                          {msg.content}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              <div className="p-3 sm:p-4 border-t border-white/5">
                <div className="relative">
                  <input 
                    type="text" 
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                    placeholder="Type a message..." 
                    className="w-full bg-black/50 border border-white/10 rounded-full py-3 pl-5 pr-12 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-[var(--color-lumen-pure)]/50 focus:ring-1 focus:ring-[var(--color-lumen-pure)]/50 transition-all"
                    aria-label="Chat message input"
                  />
                  <button 
                    onClick={handleSendMessage}
                    disabled={isSending}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-[var(--color-lumen-pure)] transition-colors disabled:opacity-50"
                    aria-label="Send message"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </GlassPanel>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ─── Agent Scratchpad ────────────────────────────────────────────
function AgentScratchpad({ isOpen, sessionId }: { isOpen: boolean; sessionId: string }) {
  const [notes, setNotes] = React.useState("")
  const [isSaving, setIsSaving] = React.useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await fetch(`/api/sessions/${sessionId}/notes`, {
        method: "POST",
        body: JSON.stringify({ notes }),
        headers: { "Content-Type": "application/json" },
      })
    } catch (e) {
      console.error("Failed to save notes", e)
    } finally {
      setIsSaving(false)
    }
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
          <div className="absolute inset-0 sm:hidden" onClick={() => {
            const toggleBtn = document.querySelector('[aria-label="Agent notes"]') as HTMLButtonElement;
            if (toggleBtn) toggleBtn.click();
          }} />
          <div className="relative h-full py-0 sm:py-6 pr-0 sm:pr-6 w-[85%] max-w-[380px] sm:w-[380px]">
            <GlassPanel className="h-full w-full flex flex-col relative rounded-2xl sm:rounded-3xl border border-white/5 bg-white/[0.02]">
              <div className="p-4 sm:p-6 border-b border-white/5 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <h2 className="font-heading text-lg text-white">Agent Scratchpad</h2>
                  <button
                    onClick={() => {
                      const toggleBtn = document.querySelector('[aria-label="Agent notes"]') as HTMLButtonElement;
                      if (toggleBtn) toggleBtn.click();
                    }}
                    className="text-gray-400 hover:text-white p-1 sm:hidden"
                    aria-label="Close notes"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <AuraButton className="px-4 py-2 text-xs" onClick={handleSave} disabled={isSaving}>
                  {isSaving ? "Saving..." : "Save"}
                </AuraButton>
              </div>
              <div className="flex-1 p-4 sm:p-6">
                <textarea
                  className="w-full h-full bg-black/50 border border-white/10 rounded-xl p-4 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-[var(--color-lumen-pure)]/50 focus:ring-1 focus:ring-[var(--color-lumen-pure)]/50 resize-none"
                  placeholder="Take private notes during the session..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  onBlur={handleSave}
                  aria-label="Agent notes"
                />
              </div>
            </GlassPanel>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ─── AI Assistant ────────────────────────────────────────────────
function AgentAssistant({ isOpen, sessionId }: { isOpen: boolean; sessionId: string }) {
  const [query, setQuery] = React.useState("")
  const [suggestion, setSuggestion] = React.useState<string | null>(null)
  const [isTyping, setIsTyping] = React.useState(false)

  const askAssistant = async () => {
    if (!query.trim()) return
    setIsTyping(true)
    setSuggestion(null)
    try {
      const res = await fetch(`/api/ai/assistant`, {
        method: "POST",
        body: JSON.stringify({ query }),
        headers: { "Content-Type": "application/json" },
      })
      if (res.ok) {
        const data = await res.json()
        setSuggestion(data.suggestion)
        setQuery("")
      }
    } catch (e) {
      console.error(e)
    } finally {
      setIsTyping(false)
    }
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
          <div className="absolute inset-0 sm:hidden" onClick={() => {
            const toggleBtn = document.querySelector('[aria-label="AI Assistant"]') as HTMLButtonElement;
            if (toggleBtn) toggleBtn.click();
          }} />
          <div className="relative h-full py-0 sm:py-6 pr-0 sm:pr-6 w-[85%] max-w-[380px] sm:w-[380px]">
            <GlassPanel className="h-full w-full flex flex-col relative rounded-2xl sm:rounded-3xl border border-amber-500/20 bg-amber-900/[0.02]">
              <div className="p-4 sm:p-6 border-b border-white/5 flex justify-between items-center bg-gradient-to-r from-amber-500/10 to-transparent">
                <div className="flex items-center gap-2 text-amber-400">
                  <Sparkles className="w-5 h-5" />
                  <h2 className="font-heading text-lg">AI Assistant</h2>
                </div>
              </div>
              <div className="flex-1 p-4 sm:p-6 overflow-y-auto">
                {!suggestion && !isTyping && (
                  <div className="h-full flex flex-col items-center justify-center text-center text-gray-500">
                    <Sparkles className="w-8 h-8 mb-4 opacity-20" />
                    <p className="text-sm">Ask me for troubleshooting steps, documentation links, or issue diagnosis.</p>
                  </div>
                )}
                {isTyping && (
                  <div className="flex items-center gap-2 text-amber-400/50 text-sm">
                    <div className="w-4 h-4 border-2 border-amber-400/50 border-t-transparent rounded-full animate-spin" />
                    Thinking...
                  </div>
                )}
                {suggestion && (
                  <div className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap bg-black/40 border border-white/5 p-4 rounded-xl">
                    {suggestion}
                  </div>
                )}
              </div>
              <div className="p-3 sm:p-4 border-t border-white/5">
                <div className="relative">
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && askAssistant()}
                    placeholder="e.g. Router is flashing red"
                    className="w-full bg-black/50 border border-white/10 rounded-full py-3 pl-5 pr-12 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50"
                  />
                  <button
                    onClick={askAssistant}
                    disabled={isTyping}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-amber-500/70 hover:text-amber-400 transition-colors disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </GlassPanel>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ─── Video Feed Components ───────────────────────────────────────
function LocalVideoFeed() {
  const { localParticipant, cameraTrack } = useLocalParticipant()
  
  if (!cameraTrack) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-black">
        <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin mb-2" />
        <span className="text-white/50 text-xs">Loading Camera...</span>
      </div>
    )
  }

  const trackRef = {
    participant: localParticipant,
    source: Track.Source.Camera,
    publication: cameraTrack,
  }

  return (
    <div className="w-full h-full relative bg-black">
      <VideoTrack trackRef={trackRef as any} className="w-full h-full object-cover scale-x-[-1]" />
    </div>
  )
}

function CustomerVideoFeed() {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: false },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  )

  const remoteCameraTrack = tracks.find(
    (t) => t.source === Track.Source.Camera && !t.participant.isLocal
  )
  const anyScreenShareTrack = tracks.find(
    (t) => t.source === Track.Source.ScreenShare
  )

  if (anyScreenShareTrack?.publication) {
    const isLocal = anyScreenShareTrack.participant.isLocal
    const label = isLocal
      ? "Your Screen Share"
      : `${anyScreenShareTrack.participant.name || "Participant"}'s Screen Share`

    return (
      <div className="w-full h-full relative bg-black">
        <VideoTrack trackRef={anyScreenShareTrack as any} className="w-full h-full object-contain" />
        <div className="absolute top-4 left-4 bg-black/60 px-3 py-1 rounded-full text-xs text-white border border-white/10 flex items-center gap-2">
          <MonitorUp className="w-3 h-3 text-cyan-400" />
          {label}
        </div>
      </div>
    )
  }

  if (!remoteCameraTrack?.publication) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-white/20 font-heading text-lg">
        <VideoIcon className="w-8 h-8 mb-4 opacity-50" />
        WAITING FOR PARTICIPANT...
      </div>
    )
  }

  return (
    <div className="w-full h-full relative bg-black">
      <VideoTrack trackRef={remoteCameraTrack as any} className="w-full h-full object-cover" />
    </div>
  )
}

// ─── Network Quality Indicator ───────────────────────────────────
function NetworkQualityIndicator() {
  const { localParticipant } = useLocalParticipant()
  if (!localParticipant) return null
  return <NetworkQualityDisplay participant={localParticipant} />
}

function NetworkQualityDisplay({ participant }: { participant: any }) {
  const { quality } = useConnectionQualityIndicator({ participant })
  return (
    <GlassPanel className="px-3 py-1.5 sm:px-4 sm:py-2 flex items-center gap-2 rounded-full text-xs">
      <Activity className={`w-3 h-3 ${quality === ConnectionQuality.Excellent ? 'text-emerald-400' : quality === ConnectionQuality.Good ? 'text-amber-400' : 'text-red-400'}`} />
      <span className="hidden sm:inline">Network</span>
    </GlassPanel>
  )
}

// ─── Reconnect Overlay ───────────────────────────────────────────
function ReconnectOverlay() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center"
    >
      <div className="text-center space-y-4">
        <WifiOff className="w-12 h-12 text-amber-400 mx-auto animate-pulse" />
        <h2 className="text-xl font-heading text-white">Reconnecting...</h2>
        <p className="text-gray-400 text-sm">Connection lost. Attempting to reconnect.</p>
        <div className="w-8 h-8 border-2 border-[var(--color-lumen-pure)] border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    </motion.div>
  )
}

// ─── Main Page Component ─────────────────────────────────────────
export default function GlassRoomPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const [token, setToken] = React.useState<string | undefined>()
  const [url, setUrl] = React.useState<string | undefined>()
  const [error, setError] = React.useState<string | null>(null)
  const [isAgent, setIsAgent] = React.useState(false)
  const [sessionId, setSessionId] = React.useState<string>("")
  const [isReconnecting, setIsReconnecting] = React.useState(false)

  const participantNameParam = searchParams.get("participantName")

  React.useEffect(() => {
    const fetchToken = async () => {
      try {
        const participantName = participantNameParam || "Participant"
        // Role is derived server-side — we just pass the room identifier
        const res = await fetch(
          `/api/livekit/token?room=${params.id}&participantName=${encodeURIComponent(participantName)}`
        )
        const data = await res.json()

        if (!res.ok) {
          throw new Error(data.error || "Failed to join session.")
        }

        setToken(data.token)
        setUrl(data.livekitUrl)
        setIsAgent(data.isAgent)
        setSessionId(data.roomId)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error")
      }
    }

    if (params.id) {
      fetchToken()
    }
  }, [params.id, participantNameParam])

  if (error) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-black text-white">
        <div className="text-center max-w-md px-6">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-heading mb-2">Session Error</h1>
          <p className="text-gray-400 mb-6">{error}</p>
          <AuraButton onClick={() => (window.location.href = "/")}>Return Home</AuraButton>
        </div>
      </div>
    )
  }

  if (!token || !url) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-black">
        <div className="w-8 h-8 rounded-full border-2 border-[var(--color-lumen-pure)] border-t-transparent animate-spin" />
      </div>
    )
  }

  if (url === "YOUR_LIVEKIT_URL" || url.includes("YOUR_LIVEKIT")) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-black text-white p-8 text-center relative">
        <div className="absolute inset-0 bg-amber-900/10 blur-[150px] pointer-events-none" />
        <div className="relative z-10 max-w-xl w-full bg-[#0a0a0a] border border-white/10 rounded-3xl p-10 shadow-2xl">
          <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-6" />
          <h1 className="text-3xl font-heading mb-4 text-white">Missing LiveKit URL</h1>
          <p className="text-gray-400 mb-8 leading-relaxed">
            Set the <code className="bg-white/10 px-2 py-1 rounded text-amber-400">LIVEKIT_URL</code> in your{" "}
            <code className="bg-white/10 px-2 py-1 rounded">.env.local</code> file.
          </p>
        </div>
      </div>
    )
  }

  const roomOptions: RoomOptions = {
    adaptiveStream: true,
    dynacast: true,
    videoCaptureDefaults: {
      resolution: VideoPresets.h720,
    },
    publishDefaults: {
      simulcast: true,
    },
    // 60-second reconnect grace window
    disconnectOnPageLeave: false,
  }

  return (
    <>
      {isReconnecting && <ReconnectOverlay />}
      <LiveKitRoom
        video={true}
        audio={true}
        token={token}
        serverUrl={url}
        connect={true}
        options={roomOptions}
        className="w-full h-full flex"
        onDisconnected={() => {
          // Don't immediately redirect — allow reconnect grace period
          setIsReconnecting(true)
          setTimeout(() => {
            // If still disconnected after 60 seconds, redirect
            setIsReconnecting(false)
            window.location.href = isAgent ? "/dashboard" : `/session/${sessionId}/csat`
          }, 60000)
        }}
        onConnected={() => {
          setIsReconnecting(false)
        }}
      >
        <GlassRoomContent isAgent={isAgent} sessionId={sessionId} />
      </LiveKitRoom>
    </>
  )
}
