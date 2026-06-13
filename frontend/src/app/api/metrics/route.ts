import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

// GET /api/metrics — Prometheus-compatible metrics endpoint
export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return new NextResponse("# Unauthorized\n", {
      status: 401,
      headers: { "Content-Type": "text/plain" },
    });
  }

  try {
    const [
      activeSessions,
      waitingSessions,
      endedSessions,
      failedSessions,
      totalRecordings,
      totalMessages,
      totalUsers,
      agentCount,
    ] = await Promise.all([
      prisma.meeting.count({ where: { status: "ACTIVE" } }),
      prisma.meeting.count({ where: { status: "WAITING" } }),
      prisma.meeting.count({ where: { status: "ENDED" } }),
      prisma.meeting.count({ where: { status: "FAILED" } }),
      prisma.recording.count(),
      prisma.message.count(),
      prisma.user.count(),
      prisma.user.count({ where: { role: "AGENT" } }),
    ]);

    // Prometheus text format
    const metrics = [
      "# HELP lumen_active_sessions Number of currently active sessions",
      "# TYPE lumen_active_sessions gauge",
      `lumen_active_sessions ${activeSessions}`,
      "",
      "# HELP lumen_waiting_sessions Number of sessions waiting for participants",
      "# TYPE lumen_waiting_sessions gauge",
      `lumen_waiting_sessions ${waitingSessions}`,
      "",
      "# HELP lumen_completed_sessions_total Total number of completed sessions",
      "# TYPE lumen_completed_sessions_total counter",
      `lumen_completed_sessions_total ${endedSessions}`,
      "",
      "# HELP lumen_failed_sessions_total Total number of failed sessions",
      "# TYPE lumen_failed_sessions_total counter",
      `lumen_failed_sessions_total ${failedSessions}`,
      "",
      "# HELP lumen_recordings_total Total number of recordings",
      "# TYPE lumen_recordings_total counter",
      `lumen_recordings_total ${totalRecordings}`,
      "",
      "# HELP lumen_messages_total Total number of chat messages",
      "# TYPE lumen_messages_total counter",
      `lumen_messages_total ${totalMessages}`,
      "",
      "# HELP lumen_registered_users Total number of registered users",
      "# TYPE lumen_registered_users gauge",
      `lumen_registered_users ${totalUsers}`,
      "",
      "# HELP lumen_registered_agents Total number of registered agents",
      "# TYPE lumen_registered_agents gauge",
      `lumen_registered_agents ${agentCount}`,
      "",
    ].join("\n");

    return new NextResponse(metrics, {
      headers: {
        "Content-Type": "text/plain; version=0.0.4; charset=utf-8",
      },
    });
  } catch {
    return new NextResponse("# Error fetching metrics\n", {
      status: 500,
      headers: { "Content-Type": "text/plain" },
    });
  }
}
