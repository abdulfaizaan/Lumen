import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { subDays, startOfDay, format } from "date-fns";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || (session.user.role !== "AGENT" && session.user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Active Sessions
  const activeSessions = await prisma.meeting.count({
    where: { status: "ACTIVE" }
  });

  // Avg Handle Time
  const endedSessions = await prisma.meeting.findMany({
    where: { status: "ENDED", durationSeconds: { gt: 0 } },
    select: { durationSeconds: true }
  });
  const avgHandleTime = endedSessions.length > 0
    ? endedSessions.reduce((acc, s) => acc + s.durationSeconds, 0) / endedSessions.length
    : 0;

  // CSAT
  const csatSessions = await prisma.meeting.findMany({
    where: { csatScore: { not: null } },
    select: { csatScore: true }
  });
  const csatScore = csatSessions.length > 0
    ? csatSessions.reduce((acc, s) => acc + s.csatScore!, 0) / csatSessions.length
    : 5.0;

  // Total 24h
  const yesterday = subDays(new Date(), 1);
  const total24h = await prisma.meeting.count({
    where: { createdAt: { gte: yesterday } }
  });

  // Traffic 7d mock data or aggregated data
  const traffic7d = [];
  for (let i = 6; i >= 0; i--) {
    const d = subDays(new Date(), i);
    const start = startOfDay(d);
    const end = startOfDay(subDays(d, -1));
    const count = await prisma.meeting.count({
      where: { createdAt: { gte: start, lt: end } }
    });
    traffic7d.push({ date: format(d, 'MMM dd'), sessions: count });
  }

  // Agent Performance
  const agentPerformance = await prisma.user.findMany({
    where: { role: "AGENT" },
    select: {
      name: true,
      agentMeetings: {
        where: { status: "ENDED" },
        select: { id: true }
      }
    }
  }).then(users => users.map(u => ({
    name: u.name || "Unknown",
    sessions: u.agentMeetings.length
  })));

  // AI Metrics
  const sentimentSessions = await prisma.meeting.findMany({
    where: { sentimentScore: { not: null } },
    select: { sentimentScore: true }
  });
  const avgSentiment = sentimentSessions.length > 0
    ? sentimentSessions.reduce((acc, s) => acc + s.sentimentScore!, 0) / sentimentSessions.length
    : 0.1; // Default to 10% frustration if no data

  // Top Issues from Tickets
  const tickets = await prisma.supportTicket.groupBy({
    by: ['category'],
    _count: { category: true },
    orderBy: { _count: { category: 'desc' } },
    take: 4
  });
  const topIssues = tickets.map(t => ({ name: t.category, count: t._count.category }));

  const totalTickets = await prisma.supportTicket.count();
  const resolvedTickets = await prisma.supportTicket.count({ where: { status: "Closed" } });
  const aiResolutionRate = totalTickets > 0 ? (resolvedTickets / totalTickets) * 100 : 0;

  return NextResponse.json({
    activeSessions,
    avgHandleTime,
    csatScore,
    total24h,
    traffic7d,
    agentPerformance,
    avgSentiment,
    topIssues,
    aiResolutionRate
  });
}
