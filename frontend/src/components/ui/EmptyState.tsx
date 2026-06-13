"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { GlassPanel } from "@/components/ui/GlassPanel"
import { Video, MessageSquare, HardDrive, Users, Plus } from "lucide-react"

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description: string
  action?: React.ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="flex flex-col items-center justify-center text-center py-16 px-8"
    >
      {icon && (
        <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6">
          {icon}
        </div>
      )}
      <h3 className="text-xl font-heading text-white mb-2">{title}</h3>
      <p className="text-gray-400 text-sm max-w-sm leading-relaxed mb-6">
        {description}
      </p>
      {action}
    </motion.div>
  )
}

export function NoSessionsEmpty({ onCreateSession }: { onCreateSession?: () => void }) {
  return (
    <EmptyState
      icon={<Video className="w-8 h-8 text-[var(--color-lumen-pure)] opacity-60" />}
      title="No Sessions Yet"
      description="Create your first support session to get started. Share the meeting ID and passcode with your customer."
      action={
        onCreateSession ? (
          <button
            onClick={onCreateSession}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[var(--color-lumen-pure)] text-black font-medium text-sm hover:bg-cyan-300 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create First Session
          </button>
        ) : undefined
      }
    />
  )
}

export function NoChatMessages() {
  return (
    <EmptyState
      icon={<MessageSquare className="w-8 h-8 text-gray-500 opacity-60" />}
      title="No Messages"
      description="Start the conversation by sending a message below."
    />
  )
}

export function NoRecordings() {
  return (
    <EmptyState
      icon={<HardDrive className="w-8 h-8 text-gray-500 opacity-60" />}
      title="No Recordings"
      description="No recordings have been made for this session yet."
    />
  )
}

export function CustomerNoSessions() {
  return (
    <EmptyState
      icon={<Users className="w-8 h-8 text-[var(--color-lumen-pure)] opacity-60" />}
      title="No Sessions Found"
      description="You haven't joined any sessions yet. Ask your support agent for a meeting ID and passcode."
    />
  )
}
