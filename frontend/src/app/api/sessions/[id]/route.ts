import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { logger } from "@/lib/logger";

// GET /api/sessions/[id] — Full session details
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
    // Try to find by ID first, then by joinToken
    const meeting =
      (await prisma.meeting.findUnique({
        where: { id: params.id },
        include: {
          agent: { select: { id: true, name: true, email: true, role: true } },
          customer: { select: { id: true, name: true, email: true, role: true } },
          messages: {
            orderBy: { createdAt: "asc" },
            include: {
              sender: { select: { id: true, name: true, role: true } },
            },
          },
          events: {
            orderBy: { timestamp: "asc" },
            include: {
              user: { select: { id: true, name: true, role: true } },
            },
          },
          recordings: {
            orderBy: { createdAt: "desc" },
          },
          attachments: {
            orderBy: { createdAt: "desc" },
            include: {
              sender: { select: { id: true, name: true, role: true } },
            },
          },
        },
      })) ||
      (await prisma.meeting.findUnique({
        where: { joinToken: params.id },
        include: {
          agent: { select: { id: true, name: true, email: true, role: true } },
          customer: { select: { id: true, name: true, email: true, role: true } },
          messages: {
            orderBy: { createdAt: "asc" },
            include: {
              sender: { select: { id: true, name: true, role: true } },
            },
          },
          events: {
            orderBy: { timestamp: "asc" },
            include: {
              user: { select: { id: true, name: true, role: true } },
            },
          },
          recordings: {
            orderBy: { createdAt: "desc" },
          },
          attachments: {
            orderBy: { createdAt: "desc" },
            include: {
              sender: { select: { id: true, name: true, role: true } },
            },
          },
        },
      }));

    if (!meeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    // Verify participant or admin
    const isParticipant =
      meeting.agentId === session.user.id ||
      meeting.customerId === session.user.id;
    const isAdmin = session.user.role === "ADMIN";

    if (!isParticipant && !isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Include role context for the current user
    const isAgent = meeting.agentId === session.user.id;

    return NextResponse.json({
      ...meeting,
      currentUserRole: isAdmin ? "ADMIN" : isAgent ? "AGENT" : "CUSTOMER",
      isAgent,
    });
  } catch (error) {
    logger.apiError(`/api/sessions/${params.id} GET`, error);
    return NextResponse.json(
      { error: "Failed to fetch session details" },
      { status: 500 }
    );
  }
}
