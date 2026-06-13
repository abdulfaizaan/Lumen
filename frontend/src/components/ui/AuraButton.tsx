"use client"

import * as React from "react"
import { motion, HTMLMotionProps } from "framer-motion"
import { cn } from "@/lib/utils"

interface AuraButtonProps extends Omit<HTMLMotionProps<"button">, "children"> {
  variant?: "primary" | "secondary" | "danger" | "ghost"
  size?: "sm" | "md" | "lg" | "icon"
  isLoading?: boolean
  children?: React.ReactNode
}

export const AuraButton = React.forwardRef<HTMLButtonElement, AuraButtonProps>(
  ({ className, variant = "primary", size = "md", isLoading, children, ...props }, ref) => {
    
    const baseStyles = "relative inline-flex items-center justify-center overflow-hidden rounded-full font-medium transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[var(--color-lumen-pure)] focus:ring-offset-2 focus:ring-offset-black"
    
    const variants = {
      primary: "bg-[var(--color-lumen-pure)] text-black hover:bg-cyan-300 shadow-[0_0_20px_rgba(0,229,255,0.3)] hover:shadow-[0_0_30px_rgba(0,229,255,0.5)]",
      secondary: "glass text-white hover:bg-[var(--color-lumen-surface-hover)] border-[var(--color-lumen-border)]",
      danger: "bg-[var(--color-lumen-error)] text-white hover:bg-rose-500 shadow-[0_0_20px_rgba(251,113,133,0.3)]",
      ghost: "bg-transparent text-white hover:bg-white/10"
    }
    
    const sizes = {
      sm: "h-9 px-4 text-xs",
      md: "h-11 px-6 text-sm",
      lg: "h-14 px-8 text-base",
      icon: "h-11 w-11"
    }

    return (
      <motion.button
        ref={ref}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        disabled={isLoading || props.disabled}
        {...props}
      >
        {/* Subsurface glow effect for primary button */}
        {variant === "primary" && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-[150%] hover:animate-[shimmer_2s_infinite]" />
        )}
        
        {isLoading ? (
          <div className="flex items-center space-x-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            <span>Loading...</span>
          </div>
        ) : (
          children
        )}
      </motion.button>
    )
  }
)
AuraButton.displayName = "AuraButton"
