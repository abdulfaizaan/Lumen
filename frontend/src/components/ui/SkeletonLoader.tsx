"use client"

import { cn } from "@/lib/utils"

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-xl bg-white/5",
        className
      )}
    />
  )
}

export function SessionCardSkeleton() {
  return (
    <div className="glass rounded-3xl p-6 space-y-4 border border-white/5">
      <div className="flex justify-between items-start">
        <div className="space-y-2 flex-1">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      <div className="flex gap-4">
        <div className="flex-1 space-y-1">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="space-y-1">
          <Skeleton className="h-3 w-14" />
          <Skeleton className="h-4 w-16" />
        </div>
      </div>
      <Skeleton className="h-9 w-full rounded-full" />
    </div>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <SessionCardSkeleton key={i} />
      ))}
    </div>
  )
}

export function ChatMessageSkeleton() {
  return (
    <div className="space-y-4 p-6">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className={`flex flex-col gap-1 ${i % 2 === 0 ? "items-start" : "items-end"}`}>
          <Skeleton className="h-3 w-16" />
          <Skeleton className={`h-12 rounded-2xl ${i % 2 === 0 ? "w-3/4 rounded-tl-none" : "w-2/3 rounded-tr-none"}`} />
        </div>
      ))}
    </div>
  )
}

export function SessionDetailSkeleton() {
  return (
    <div className="space-y-6 p-8">
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-40" />
        </div>
        <Skeleton className="h-8 w-24 rounded-full" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-24 rounded-2xl" />
      </div>
      <Skeleton className="h-96 rounded-2xl" />
    </div>
  )
}
