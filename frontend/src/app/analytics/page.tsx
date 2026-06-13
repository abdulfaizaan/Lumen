"use client"

import { useState, useEffect } from "react"
import { GlassPanel } from "@/components/ui/GlassPanel"
import { AuraButton } from "@/components/ui/AuraButton"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, PieChart, Pie, Cell } from "recharts"
import { io } from "socket.io-client"
import { Activity, Clock, PhoneCall, Star, Brain, Gauge } from "lucide-react"

export default function AnalyticsPage() {
  const [metrics, setMetrics] = useState<any>(null)

  useEffect(() => {
    let socket: ReturnType<typeof io>

    const init = async () => {
      const res = await fetch("/api/analytics")
      if (res.ok) {
        setMetrics(await res.json())
      }

      // We can also fetch the user id from /api/sessions like in queue page
      const sessionRes = await fetch("/api/sessions")
      if (sessionRes.ok) {
        const data = await sessionRes.json()
        socket = io(window.location.origin, { path: "/ws" })
        socket.emit("join_agent_room", data.userId)

        socket.on("SESSION_ENDED", () => {
          // Refresh metrics when a session ends
          fetch("/api/analytics").then(r => r.json()).then(setMetrics)
        })
      }
    }

    init()

    return () => {
      if (socket) socket.disconnect()
    }
  }, [])

  if (!metrics) {
    return <div className="min-h-screen bg-black flex items-center justify-center"><Activity className="w-8 h-8 animate-spin text-[var(--color-lumen-pure)]" /></div>
  }

  const kpiCards = [
    { label: "Active Sessions", value: metrics.activeSessions, icon: PhoneCall, color: "text-cyan-400" },
    { label: "Avg Handle Time", value: `${Math.floor(metrics.avgHandleTime / 60)}m ${metrics.avgHandleTime % 60}s`, icon: Clock, color: "text-amber-400" },
    { label: "CSAT Score", value: metrics.csatScore.toFixed(1), icon: Star, color: "text-yellow-400" },
    { label: "AI Frustration Index", value: `${(metrics.avgSentiment * 100).toFixed(0)}%`, icon: Gauge, color: metrics.avgSentiment > 0.5 ? "text-red-400" : "text-emerald-400" },
  ]

  return (
    <main className="min-h-screen bg-[var(--background)] p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="flex items-center justify-between">
          <h1 className="text-3xl font-heading text-white flex items-center gap-3">
            <Activity className="w-8 h-8 text-[var(--color-lumen-pure)]" />
            Platform Analytics
          </h1>
          <AuraButton variant="secondary" onClick={() => window.location.href = "/dashboard"}>
            Dashboard
          </AuraButton>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {kpiCards.map((kpi, i) => (
            <GlassPanel key={i} className="p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-gray-400 text-sm font-medium">{kpi.label}</span>
                <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
              </div>
              <div className="text-3xl font-heading text-white">{kpi.value}</div>
            </GlassPanel>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <GlassPanel className="p-6 h-[400px] flex flex-col">
            <h3 className="text-lg font-medium text-white mb-6">Traffic (Last 7 Days)</h3>
            <div className="flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={metrics.traffic7d}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                  <XAxis dataKey="date" stroke="#ffffff50" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#ffffff50" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #ffffff20', borderRadius: '8px' }}
                    itemStyle={{ color: '#00e5ff' }}
                  />
                  <Line type="monotone" dataKey="sessions" stroke="#00e5ff" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </GlassPanel>

          <GlassPanel className="p-6 h-[400px] flex flex-col">
            <h3 className="text-lg font-medium text-white mb-6">Agent Performance</h3>
            <div className="flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.agentPerformance} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" horizontal={false} />
                  <XAxis type="number" stroke="#ffffff50" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis dataKey="name" type="category" stroke="#ffffff50" fontSize={12} tickLine={false} axisLine={false} width={100} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #ffffff20', borderRadius: '8px' }}
                    itemStyle={{ color: '#00e5ff' }}
                  />
                  <Bar dataKey="sessions" fill="#00e5ff" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </GlassPanel>
          <GlassPanel className="p-6 h-[400px] flex flex-col">
            <h3 className="text-lg font-medium text-white mb-6 flex items-center gap-2">
              <Brain className="w-5 h-5 text-amber-400" />
              AI Issue Classification
            </h3>
            <div className="flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.topIssues} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" horizontal={false} />
                  <XAxis type="number" stroke="#ffffff50" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis dataKey="name" type="category" stroke="#ffffff50" fontSize={12} tickLine={false} axisLine={false} width={100} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #ffffff20', borderRadius: '8px' }}
                    itemStyle={{ color: '#f59e0b' }}
                  />
                  <Bar dataKey="count" fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 flex justify-between items-center pt-4 border-t border-white/5">
              <span className="text-sm text-gray-400">AI Automated Resolution Rate</span>
              <span className="text-lg font-bold text-emerald-400">{metrics.aiResolutionRate.toFixed(1)}%</span>
            </div>
          </GlassPanel>
        </div>
      </div>
    </main>
  )
}
