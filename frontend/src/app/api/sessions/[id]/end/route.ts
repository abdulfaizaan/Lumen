import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { RoomServiceClient } from "livekit-server-sdk";
import { logger } from "@/lib/logger";
import { eventBus } from "@/lib/events/EventBus";
import { backgroundQueue } from "@/lib/queue/worker";

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
    const meeting = await prisma.meeting.findUnique({
      where: { id: params.id },
    });

    if (!meeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    // Only the agent can end the session
    if (meeting.agentId !== session.user.id) {
      return NextResponse.json(
        { error: "Unauthorized to end this session" },
        { status: 403 }
      );
    }

    // ── Calculate duration ────────────────────────────────────────
    const now = new Date();
    const startedAt = meeting.startedAt || meeting.createdAt;
    const durationSeconds = Math.floor(
      (now.getTime() - startedAt.getTime()) / 1000
    );

    // ── Update meeting ───────────────────────────────────────────
    await prisma.meeting.update({
      where: { id: params.id },
      data: {
        status: "ENDED",
        endedAt: now,
        durationSeconds,
      },
    });

    // ── Create session ended event ───────────────────────────────
    await prisma.sessionEvent.create({
      data: {
        sessionId: params.id,
        eventType: "SESSION_ENDED",
        userId: session.user.id,
        metadata: JSON.stringify({ durationSeconds }),
      },
    });

    // ── Close LiveKit room ───────────────────────────────────────
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const wsUrl = process.env.LIVEKIT_URL;

    if (apiKey && apiSecret && wsUrl && wsUrl !== "YOUR_LIVEKIT_URL") {
      const httpUrl = wsUrl
        .replace("wss://", "https://")
        .replace("ws://", "http://");
      const roomService = new RoomServiceClient(httpUrl, apiKey, apiSecret);
      try {
        await roomService.deleteRoom(params.id);
      } catch (lkError) {
        logger.warn("Failed to delete LiveKit room", {
          roomId: params.id,
          error:
            lkError instanceof Error ? lkError.message : String(lkError),
        });
      }
    }

    logger.sessionEnded(params.id, durationSeconds);

    eventBus.publish('SESSION_ENDED', { sessionId: params.id, durationSeconds });

    // Queue post-call AI processing
    await backgroundQueue.add('POST_CALL_ANALYSIS', { sessionId: params.id });

    return NextResponse.json({ success: true, durationSeconds });
  } catch (error) {
    logger.apiError(`/api/sessions/${params.id}/end`, error);
    return NextResponse.json(
      { error: "Failed to end session" },
      { status: 500 }
    );
  }
}
