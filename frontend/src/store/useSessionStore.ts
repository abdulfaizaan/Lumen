import { create } from "zustand"

export type ParticipantRole = "agent" | "customer"
export type NetworkQuality = "excellent" | "good" | "poor" | "disconnected"

export interface Participant {
  id: string
  name: string
  role: ParticipantRole
  isMuted: boolean
  isVideoOff: boolean
  networkQuality: NetworkQuality
  joinedAt: Date
}

export interface ChatMessage {
  id: string
  senderId: string
  senderName: string
  text: string
  timestamp: Date
  isSystemMessage: boolean
}

interface SessionState {
  // Connection Details
  sessionId: string | null
  isConnected: boolean
  latencyMs: number
  
  // Participants
  participants: Record<string, Participant>
  activeSpeakerId: string | null
  
  // Local Media Controls
  isLocalMuted: boolean
  isLocalVideoOff: boolean
  
  // UI State
  isChatOpen: boolean
  
  // Chat
  messages: ChatMessage[]
  
  // Actions
  setSessionId: (id: string) => void
  setConnectionStatus: (connected: boolean, latency?: number) => void
  addParticipant: (participant: Participant) => void
  removeParticipant: (id: string) => void
  updateParticipant: (id: string, updates: Partial<Participant>) => void
  setActiveSpeaker: (id: string | null) => void
  toggleLocalMute: () => void
  toggleLocalVideo: () => void
  toggleChat: () => void
  addMessage: (message: Omit<ChatMessage, "id" | "timestamp">) => void
}

export const useSessionStore = create<SessionState>((set) => ({
  // Initial State
  sessionId: null,
  isConnected: false,
  latencyMs: 0,
  
  participants: {},
  activeSpeakerId: null,
  
  isLocalMuted: false,
  isLocalVideoOff: false,
  isChatOpen: true,
  
  messages: [],

  // Actions
  setSessionId: (id) => set({ sessionId: id }),
  
  setConnectionStatus: (connected, latency = 0) => set({ 
    isConnected: connected, 
    latencyMs: latency 
  }),
  
  addParticipant: (participant) => set((state) => ({
    participants: { ...state.participants, [participant.id]: participant }
  })),
  
  removeParticipant: (id) => set((state) => {
    const nextParticipants = { ...state.participants }
    delete nextParticipants[id]
    return { participants: nextParticipants }
  }),
  
  updateParticipant: (id, updates) => set((state) => ({
    participants: {
      ...state.participants,
      [id]: { ...state.participants[id], ...updates }
    }
  })),
  
  setActiveSpeaker: (id) => set({ activeSpeakerId: id }),
  
  toggleLocalMute: () => set((state) => ({ isLocalMuted: !state.isLocalMuted })),
  
  toggleLocalVideo: () => set((state) => ({ isLocalVideoOff: !state.isLocalVideoOff })),
  
  toggleChat: () => set((state) => ({ isChatOpen: !state.isChatOpen })),
  
  addMessage: (message) => set((state) => ({
    messages: [
      ...state.messages,
      {
        ...message,
        id: crypto.randomUUID(),
        timestamp: new Date()
      }
    ]
  }))
}))
