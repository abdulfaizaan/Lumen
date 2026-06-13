import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { chatMessageSchema, formatZodErrors } from "@/lib/validations";
import { logger } from "@/lib/logger";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "10 s"), // 10 messages per 10 seconds
  analytics: true,
});

// GET /api/sessions/[id]/messages — Retrieve chat history
export async function GET(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const meeting = await prisma.meeting.findUnique({
      where: { id: params.id },
    });

    if (!meeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    // Only participants can read messages
    if (
      meeting.agentId !== session.user.id &&
      meeting.customerId !== session.user.id &&
      session.user.role !== "ADMIN"
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Cursor-based pagination
    const url = new URL(req.url);
    const cursor = url.searchParams.get("cursor");
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 100);

    const messages = await prisma.message.findMany({
      where: { sessionId: params.id },
      orderBy: { createdAt: "asc" },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        sender: {
          select: { id: true, name: true, role: true },
        },
      },
    });

    const hasMore = messages.length > limit;
    if (hasMore) messages.pop();

    return NextResponse.json({
      messages,
      nextCursor: hasMore ? messages[messages.length - 1]?.id : null,
    });
  } catch (error) {
    logger.apiError(`/api/sessions/${params.id}/messages GET`, error);
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}

// POST /api/sessions/[id]/messages — Send and persist a chat message
export async function POST(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Rate Limiting
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    const { success } = await ratelimit.limit(`msg_${ip}`);
    if (!success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await req.json();
    const parsed = chatMessageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(formatZodErrors(parsed.error), { status: 400 });
    }

    const meeting = await prisma.meeting.findUnique({
      where: { id: params.id },
    });

    if (!meeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    // Only participants can send messages
    if (
      meeting.agentId !== session.user.id &&
      meeting.customerId !== session.user.id
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const senderRole =
      session.user.id === meeting.agentId ? "AGENT" : "CUSTOMER";

    const message = await prisma.message.create({
      data: {
        sessionId: params.id,
        senderId: session.user.id,
        senderRole,
        content: parsed.data.content,
      },
      include: {
        sender: {
          select: { id: true, name: true, role: true },
        },
      },
    });

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    logger.apiError(`/api/sessions/${params.id}/messages POST`, error);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}
