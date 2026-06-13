"use client"

import * as React from "react"
import { motion, HTMLMotionProps } from "framer-motion"
import { cn } from "@/lib/utils"

interface GlassPanelProps extends Omit<HTMLMotionProps<"div">, "children"> {
  hoverEffect?: boolean
  children?: React.ReactNode
}

export const GlassPanel = React.forwardRef<HTMLDivElement, GlassPanelProps>(
  ({ className, hoverEffect = false, children, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        className={cn(
          "glass rounded-3xl overflow-hidden transition-colors duration-300",
          hoverEffect && "hover:bg-[var(--color-lumen-surface-hover)]",
          className
        )}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        {...props}
      >
        {children}
      </motion.div>
    )
  }
)
GlassPanel.displayName = "GlassPanel"
