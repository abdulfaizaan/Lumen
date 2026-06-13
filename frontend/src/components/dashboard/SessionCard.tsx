"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { GlassPanel } from "@/components/ui/GlassPanel"
import { AuraButton } from "@/components/ui/AuraButton"
import { Video, Wifi, Clock } from "lucide-react"
import Link from "next/link"

interface SessionCardProps {
  id: string
  customerName: string
  status: "waiting" | "active"
  duration?: string
  bandwidth?: string
}

export function SessionCard({ id, customerName, status, duration, bandwidth }: SessionCardProps) {
  return (
    <GlassPanel hoverEffect className="p-6 flex flex-col space-y-6 group relative">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-xl font-heading font-medium text-white group-hover:text-[var(--color-lumen-pure)] transition-colors">
            {customerName}
          </h3>
          <p className="text-sm text-gray-400 mt-1">Session ID: {id}</p>
        </div>
        <div className="flex items-center space-x-2">
          {status === "active" ? (
            <span className="flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-[var(--color-lumen-pure)] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-[var(--color-lumen-pure)]"></span>
            </span>
          ) : (
            <span className="relative inline-flex rounded-full h-3 w-3 bg-[var(--color-lumen-warning)]"></span>
          )}
        </div>
      </div>
      
      <div className="flex space-x-4 text-xs text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity duration-300 translate-y-2 group-hover:translate-y-0">
        {status === "active" && (
          <>
            <div className="flex items-center space-x-1 bg-white/5 px-2 py-1 rounded-md border border-white/10">
              <Clock className="w-3 h-3 text-[var(--color-lumen-pure)]" />
              <span>{duration}</span>
            </div>
            <div className="flex items-center space-x-1 bg-white/5 px-2 py-1 rounded-md border border-white/10">
              <Wifi className="w-3 h-3 text-[var(--color-lumen-success)]" />
              <span>{bandwidth}</span>
            </div>
          </>
        )}
        {status === "waiting" && (
          <div className="flex items-center space-x-1 bg-white/5 px-2 py-1 rounded-md border border-white/10 text-amber-300">
            <span>Pending Consent</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-[var(--color-lumen-border)]">
        {status === "active" ? (
          <Link href={`/session/${id}`} className="w-full">
            <AuraButton variant="secondary" size="sm" className="w-full">
              Join Active Room
            </AuraButton>
          </Link>
        ) : (
          <AuraButton variant="primary" size="sm" className="w-full">
            Accept Session
          </AuraButton>
        )}
      </div>
    </GlassPanel>
  )
}
