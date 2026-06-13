"use client"

import { useEffect, useState } from "react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts"
import { GlassPanel } from "./ui/GlassPanel"
import { Loader2 } from "lucide-react"

const COLORS = ['#06b6d4', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444'];

export function AdminAnalyticsCharts() {
  const [ticketData, setTicketData] = useState([])
  const [sentimentData, setSentimentData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/admin/analytics")
      .then(res => res.json())
      .then(data => {
        if (data.ticketData) setTicketData(data.ticketData)
        if (data.sentimentData) setSentimentData(data.sentimentData)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 w-full">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      {/* Sentiment Chart */}
      <GlassPanel className="p-6 h-80">
        <h3 className="text-gray-400 text-sm font-medium mb-4">Average Sentiment Over Time</h3>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={sentimentData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} />
            <YAxis stroke="#9ca3af" fontSize={12} domain={[0, 100]} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.1)' }}
              itemStyle={{ color: '#fff' }}
            />
            <Line type="monotone" dataKey="sentiment" stroke="#06b6d4" strokeWidth={3} dot={{ r: 4, fill: '#06b6d4' }} />
          </LineChart>
        </ResponsiveContainer>
      </GlassPanel>

      {/* Ticket Categories Chart */}
      <GlassPanel className="p-6 h-80">
        <h3 className="text-gray-400 text-sm font-medium mb-4">AI Support Ticket Categories</h3>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={ticketData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
            >
              {ticketData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.1)' }}
              itemStyle={{ color: '#fff' }}
            />
            <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '12px', color: '#9ca3af' }}/>
          </PieChart>
        </ResponsiveContainer>
      </GlassPanel>
    </div>
  )
}
