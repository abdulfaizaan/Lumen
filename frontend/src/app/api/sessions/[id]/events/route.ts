import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { logger } from "@/lib/logger";

// GET /api/sessions/[id]/events — Retrieve session event timeline
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

    // Only participants or admins can view events
    if (
      meeting.agentId !== session.user.id &&
      meeting.customerId !== session.user.id &&
      session.user.role !== "ADMIN"
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const events = await prisma.sessionEvent.findMany({
      where: { sessionId: params.id },
      orderBy: { timestamp: "asc" },
      include: {
        user: {
          select: { id: true, name: true, role: true },
        },
      },
    });

    return NextResponse.json({ events });
  } catch (error) {
    logger.apiError(`/api/sessions/${params.id}/events GET`, error);
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 }
    );
  }
}

// POST /api/sessions/[id]/events — Create a session event
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
    const { eventType, metadata } = await req.json();

    if (!eventType) {
      return NextResponse.json(
        { error: "eventType is required" },
        { status: 400 }
      );
    }

    const validEvents = [
      "PARTICIPANT_JOINED",
      "PARTICIPANT_LEFT",
      "RECORDING_STARTED",
      "RECORDING_STOPPED",
      "SESSION_ENDED",
      "RECONNECTED",
    ];

    if (!validEvents.includes(eventType)) {
      return NextResponse.json(
        { error: "Invalid event type" },
        { status: 400 }
      );
    }

    const event = await prisma.sessionEvent.create({
      data: {
        sessionId: params.id,
        eventType,
        userId: session.user.id,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });

    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    logger.apiError(`/api/sessions/${params.id}/events POST`, error);
    return NextResponse.json(
      { error: "Failed to create event" },
      { status: 500 }
    );
  }
}
