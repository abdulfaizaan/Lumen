"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { GlassPanel } from "@/components/ui/GlassPanel"
import { AuraButton } from "@/components/ui/AuraButton"
import { DashboardSkeleton } from "@/components/ui/SkeletonLoader"
import { ShieldCheck, Video, Clock, MessageSquare, Download, CheckCircle2, PhoneOff, Star } from "lucide-react"
import { AdminAnalyticsCharts } from "@/components/AdminAnalyticsCharts"

type Session = {
  id: string
  status: string
  agentId: string
  customerName: string | null
  meetingId: string
  durationSeconds: number
  createdAt: string
  csatScore: number | null
  agent?: { id: string; name: string; email: string }
  customer?: { id: string; name: string; email: string }
  _count?: { messages: number; events: number; attachments: number }
}

export default function AdminDashboard() {
  const router = useRouter()
  const [sessions, setSessions] = useState<Session[]>([])
  const [stats, setStats] = useState({ activeCount: 0, totalCount: 0, recordingCount: 0, averageCsat: null as number | null })
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState("ALL") // ALL, ACTIVE, ENDED

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const res = await fetch(`/api/admin/sessions${filter !== "ALL" ? `?status=${filter}` : ""}`)
        if (res.ok) {
          const data = await res.json()
          setSessions(data.sessions || [])
          if (data.stats) setStats(data.stats)
        } else {
          router.push("/dashboard") // Redirect if unauthorized
        }
      } catch (error) {
        console.error("Failed to fetch admin sessions", error)
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchSessions()
    const interval = setInterval(fetchSessions, 5000)
    return () => clearInterval(interval)
  }, [filter, router])

  const handleTerminate = async (sessionId: string) => {
    if (!window.confirm("Are you sure you want to force-terminate this session?")) return
    try {
      await fetch(`/api/admin/sessions/${sessionId}/terminate`, { method: "POST" })
      setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, status: "ENDED" } : s))
    } catch (err) {
      console.error("Terminate failed", err)
    }
  }

  return (
    <main className="min-h-screen bg-[var(--background)] bg-[radial-gradient(ellipse_at_top_right,_var(--color-lumen-surface),_transparent_50%)] p-4 sm:p-8">
      <div className="max-w-7xl mx-auto space-y-8 sm:space-y-12">
        {/* Header */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-heading font-medium tracking-tight text-white flex items-center space-x-3">
              <ShieldCheck className="w-8 h-8 text-cyan-400" />
              <span>Admin Dashboard</span>
            </h1>
            <p className="text-gray-400 mt-2 text-sm sm:text-base">
              System overview and global session management.
            </p>
          </div>
          <div className="flex gap-3">
            <AuraButton variant="secondary" onClick={() => router.push("/dashboard")}>
              Exit Admin
            </AuraButton>
          </div>
        </header>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <GlassPanel className="p-6">
            <h3 className="text-gray-400 text-sm font-medium mb-2">Active Sessions</h3>
            <p className="text-3xl font-heading text-white">{stats.activeCount}</p>
          </GlassPanel>
          <GlassPanel className="p-6">
            <h3 className="text-gray-400 text-sm font-medium mb-2">Total Sessions</h3>
            <p className="text-3xl font-heading text-white">{stats.totalCount}</p>
          </GlassPanel>
          <GlassPanel className="p-6">
            <h3 className="text-gray-400 text-sm font-medium mb-2">Avg CSAT</h3>
            <div className="flex items-center gap-2">
              <p className="text-3xl font-heading text-white">{stats.averageCsat || "-"}</p>
              {stats.averageCsat && <Star className="w-5 h-5 text-amber-400 fill-amber-400" />}
            </div>
          </GlassPanel>
          <GlassPanel className="p-6">
            <h3 className="text-gray-400 text-sm font-medium mb-2">Recordings Generated</h3>
            <p className="text-3xl font-heading text-white">{stats.recordingCount}</p>
          </GlassPanel>
        </div>

        {/* Analytics Charts */}
        <AdminAnalyticsCharts />

        {/* Filters */}
        <div className="flex gap-2 border-b border-white/10 pb-4">
          {["ALL", "ACTIVE", "WAITING", "ENDED"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                filter === f
                  ? "bg-white text-black"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              {f.charAt(0) + f.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {/* Data Table */}
        {isLoading ? (
          <DashboardSkeleton />
        ) : (
          <GlassPanel className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-300">
              <thead className="bg-white/5 font-heading text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-6 py-4 rounded-tl-xl">Session ID</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Agent</th>
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">Stats</th>
                  <th className="px-6 py-4 rounded-tr-xl">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {sessions.map((session) => (
                  <tr key={session.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4 font-mono text-xs">{session.id.substring(0, 8)}...</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs ${
                        session.status === "ACTIVE" ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20" :
                        session.status === "WAITING" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                        "bg-gray-500/10 text-gray-400 border border-gray-500/20"
                      }`}>
                        {session.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div>{session.agent?.name}</div>
                      <div className="text-xs text-gray-500">{session.agent?.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      {session.customer ? (
                        <>
                          <div>{session.customer.name}</div>
                          <div className="text-xs text-gray-500">{session.customer.email}</div>
                        </>
                      ) : (
                        <span className="text-gray-500 italic">No customer yet</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1 text-xs text-gray-400">
                        <span className="flex items-center gap-1" title="Messages"><MessageSquare className="w-3 h-3" /> {session._count?.messages || 0}</span>
                        <span className="flex items-center gap-1" title="Duration"><Clock className="w-3 h-3" /> {session.durationSeconds}s</span>
                        {session.csatScore && (
                          <span className="flex items-center gap-1 text-amber-400" title="CSAT Score"><Star className="w-3 h-3 fill-amber-400" /> {session.csatScore}/5</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <AuraButton variant="secondary" size="sm" onClick={() => router.push(`/session/${session.id}/history`)}>
                          Details
                        </AuraButton>
                        {session.status === "ACTIVE" && (
                          <AuraButton variant="danger" size="sm" onClick={() => handleTerminate(session.id)}>
                            <PhoneOff className="w-3 h-3" />
                          </AuraButton>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {sessions.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      No sessions found for this filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </GlassPanel>
        )}
      </div>
    </main>
  )
}
