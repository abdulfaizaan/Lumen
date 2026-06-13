"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { AlertTriangle, X } from "lucide-react"
import { AuraButton } from "@/components/ui/AuraButton"

interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: "danger" | "warning"
  isLoading?: boolean
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  isLoading = false,
}: ConfirmDialogProps) {
  // Close on Escape
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose()
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, onClose])

  // Trap focus inside dialog
  const dialogRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (isOpen && dialogRef.current) {
      const firstFocusable = dialogRef.current.querySelector<HTMLElement>(
        "button, [tabindex]:not([tabindex='-1'])"
      )
      firstFocusable?.focus()
    }
  }, [isOpen])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Dialog */}
          <motion.div
            ref={dialogRef}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md z-50"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            aria-describedby="confirm-dialog-description"
          >
            <div className="glass rounded-3xl border border-white/10 p-8 shadow-2xl mx-4">
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors p-1"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Icon */}
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 ${
                variant === "danger" 
                  ? "bg-red-500/10 border border-red-500/20" 
                  : "bg-amber-500/10 border border-amber-500/20"
              }`}>
                <AlertTriangle className={`w-7 h-7 ${
                  variant === "danger" ? "text-red-400" : "text-amber-400"
                }`} />
              </div>

              {/* Content */}
              <h2 id="confirm-dialog-title" className="text-xl font-heading text-white mb-2">
                {title}
              </h2>
              <p id="confirm-dialog-description" className="text-sm text-gray-400 leading-relaxed mb-8">
                {description}
              </p>

              {/* Actions */}
              <div className="flex gap-3">
                <AuraButton
                  variant="ghost"
                  className="flex-1 border border-white/10"
                  onClick={onClose}
                  disabled={isLoading}
                >
                  {cancelLabel}
                </AuraButton>
                <AuraButton
                  variant={variant === "danger" ? "danger" : "primary"}
                  className="flex-1"
                  onClick={onConfirm}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : (
                    confirmLabel
                  )}
                </AuraButton>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
