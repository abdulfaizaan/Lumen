import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { randomUUID, randomInt, randomBytes } from "crypto";
import { logger } from "@/lib/logger";
import { eventBus } from "@/lib/events/EventBus";

// GET /api/sessions — List sessions with cursor-based pagination
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const url = new URL(req.url);
    const cursor = url.searchParams.get("cursor");
    const limit = Math.min(
      parseInt(url.searchParams.get("limit") || "20"),
      100
    );
    const statusFilter = url.searchParams.get("status");

    const role = session.user.role;
    const isAgent = role === "AGENT" || role === "ADMIN";

    const where: Record<string, unknown> = isAgent
      ? { agentId: session.user.id }
      : { customerId: session.user.id };

    if (statusFilter) {
      where.status = statusFilter;
    }

    const sessions = await prisma.meeting.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        agent: { select: { id: true, name: true } },
        customer: { select: { id: true, name: true } },
        recordings: { select: { id: true, status: true } },
        _count: { select: { messages: true, events: true } },
      },
    });

    const hasMore = sessions.length > limit;
    if (hasMore) sessions.pop();

    return NextResponse.json({
      sessions,
      role,
      userId: session.user.id,
      nextCursor: hasMore ? sessions[sessions.length - 1]?.id : null,
    });
  } catch (error) {
    logger.apiError("/api/sessions GET", error);
    return NextResponse.json(
      { error: "Failed to fetch sessions" },
      { status: 500 }
    );
  }
}

// POST /api/sessions — Create a new session (agent only)
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Server-side role enforcement ─────────────────────────────
  if (session.user.role !== "AGENT" && session.user.role !== "ADMIN") {
    logger.authFailure("Non-agent attempted session creation", {
      userId: session.user.id,
      role: session.user.role,
    });
    return NextResponse.json(
      { error: "Only agents can create sessions" },
      { status: 403 }
    );
  }

  try {
    let meetingId = "";
    let passcode = "";
    let isUnique = false;

    // Collision handling loop
    while (!isUnique) {
      meetingId = (1000000000 + randomInt(9000000000)).toString();
      passcode = randomBytes(4).toString("hex").substring(0, 6).toUpperCase();

      const existing = await prisma.meeting.findUnique({
        where: { meetingId },
      });
      if (!existing) {
        isUnique = true;
      }
    }

    const meeting = await prisma.meeting.create({
      data: {
        agentId: session.user.id,
        status: "WAITING",
        joinToken: randomUUID().replace(/-/g, "").substring(0, 16),
        meetingId,
        passcode,
      },
    });

    logger.sessionCreated(meeting.id, session.user.id);

    eventBus.publish('SESSION_CREATED', meeting);

    return NextResponse.json(meeting);
  } catch (error) {
    logger.apiError("/api/sessions POST", error);
    return NextResponse.json(
      { error: "Failed to create session" },
      { status: 500 }
    );
  }
}
