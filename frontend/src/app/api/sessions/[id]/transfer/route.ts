import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { eventBus } from "@/lib/events/EventBus";
import { logger } from "@/lib/logger";

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
    const { targetAgentId } = await req.json();
    if (!targetAgentId) {
      return NextResponse.json({ error: "Missing targetAgentId" }, { status: 400 });
    }

    const meeting = await prisma.meeting.findUnique({
      where: { id: params.id },
    });

    if (!meeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    // Only the current agent can transfer the session
    if (meeting.agentId !== session.user.id) {
      return NextResponse.json(
        { error: "Unauthorized to transfer this session" },
        { status: 403 }
      );
    }

    // Verify target agent exists and is online
    const targetAgent = await prisma.user.findUnique({
      where: { id: targetAgentId }
    });

    if (!targetAgent || targetAgent.role !== "AGENT" || targetAgent.agentStatus !== "ONLINE") {
      return NextResponse.json(
        { error: "Target agent is unavailable" },
        { status: 400 }
      );
    }

    // Update meeting with transfer details
    const updatedMeeting = await prisma.$transaction(async (tx) => {
      const updated = await tx.meeting.update({
        where: { id: params.id },
        data: {
          agentId: targetAgentId,
          transferredFromId: session.user.id,
          transferredToId: targetAgentId,
        },
      });

      // Free up current agent, make target agent busy
      await tx.user.update({
        where: { id: session.user.id },
        data: { agentStatus: "ONLINE" }
      });
      await tx.user.update({
        where: { id: targetAgentId },
        data: { agentStatus: "BUSY" }
      });

      // Log event
      await tx.sessionEvent.create({
        data: {
          sessionId: params.id,
          eventType: "PARTICIPANT_JOINED", // Represents a routing event
          userId: targetAgentId,
          metadata: JSON.stringify({ type: "TRANSFER", from: session.user.id, to: targetAgentId })
        }
      });

      return updated;
    });

    // Notify agents via EventBus
    eventBus.publish("SESSION_TRANSFERRED", {
      sessionId: params.id,
      fromAgentId: session.user.id,
      toAgentId: targetAgentId
    });

    return NextResponse.json({ success: true, meeting: updatedMeeting });
  } catch (error) {
    logger.apiError(`/api/sessions/${params.id}/transfer`, error);
    return NextResponse.json(
      { error: "Failed to transfer session" },
      { status: 500 }
    );
  }
}
