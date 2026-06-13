import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { logger } from "@/lib/logger";

// GET /api/admin/sessions — List all sessions (admin only)
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const url = new URL(req.url);
    const cursor = url.searchParams.get("cursor");
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "20"), 100);
    const statusFilter = url.searchParams.get("status");
    const agentId = url.searchParams.get("agentId");
    const dateFrom = url.searchParams.get("dateFrom");
    const dateTo = url.searchParams.get("dateTo");

    const where: Record<string, unknown> = {};
    if (statusFilter) where.status = statusFilter;
    if (agentId) where.agentId = agentId;
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) (where.createdAt as Record<string, unknown>).gte = new Date(dateFrom);
      if (dateTo) (where.createdAt as Record<string, unknown>).lte = new Date(dateTo);
    }

    const sessions = await prisma.meeting.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        agent: { select: { id: true, name: true, email: true } },
        customer: { select: { id: true, name: true, email: true } },
        recordings: { select: { id: true, status: true } },
        _count: { select: { messages: true, events: true, attachments: true } },
      },
    });

    const hasMore = sessions.length > limit;
    if (hasMore) sessions.pop();

    // Get summary stats
    const [activeCount, totalCount, recordingCount, csatAgg] = await Promise.all([
      prisma.meeting.count({ where: { status: "ACTIVE" } }),
      prisma.meeting.count(),
      prisma.recording.count(),
      prisma.meeting.aggregate({
        _avg: { csatScore: true },
      }),
    ]);

    return NextResponse.json({
      sessions,
      nextCursor: hasMore ? sessions[sessions.length - 1]?.id : null,
      stats: { 
        activeCount, 
        totalCount, 
        recordingCount,
        averageCsat: csatAgg._avg.csatScore ? Number(csatAgg._avg.csatScore.toFixed(1)) : null
      },
    });
  } catch (error) {
    logger.apiError("/api/admin/sessions GET", error);
    return NextResponse.json(
      { error: "Failed to fetch sessions" },
      { status: 500 }
    );
  }
}
