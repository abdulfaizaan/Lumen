import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { RoomServiceClient } from "livekit-server-sdk";
import { logger } from "@/lib/logger";

// POST /api/admin/sessions/[id]/terminate — Force-terminate a session
export async function POST(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const meeting = await prisma.meeting.findUnique({
      where: { id: params.id },
    });

    if (!meeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    const now = new Date();
    const startedAt = meeting.startedAt || meeting.createdAt;
    const durationSeconds = Math.floor(
      (now.getTime() - startedAt.getTime()) / 1000
    );

    await prisma.meeting.update({
      where: { id: params.id },
      data: {
        status: "ENDED",
        endedAt: now,
        durationSeconds,
      },
    });

    await prisma.sessionEvent.create({
      data: {
        sessionId: params.id,
        eventType: "SESSION_ENDED",
        userId: session.user.id,
        metadata: JSON.stringify({
          terminatedByAdmin: true,
          adminId: session.user.id,
          durationSeconds,
        }),
      },
    });

    // Close LiveKit room
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
        logger.warn("Failed to delete LiveKit room on admin terminate", {
          roomId: params.id,
        });
      }
    }

    logger.info("Session terminated by admin", {
      sessionId: params.id,
      adminId: session.user.id,
    });

    return NextResponse.json({ success: true, durationSeconds });
  } catch (error) {
    logger.apiError(`/api/admin/sessions/${params.id}/terminate`, error);
    return NextResponse.json(
      { error: "Failed to terminate session" },
      { status: 500 }
    );
  }
}
