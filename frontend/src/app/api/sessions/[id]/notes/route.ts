import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { noteUpdateSchema, formatZodErrors } from "@/lib/validations";
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
    const body = await req.json();

    // ── Validate input ───────────────────────────────────────────
    const parsed = noteUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(formatZodErrors(parsed.error), { status: 400 });
    }

    const meeting = await prisma.meeting.findUnique({
      where: { id: params.id },
    });

    if (!meeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    if (meeting.agentId !== session.user.id) {
      return NextResponse.json(
        { error: "Unauthorized to edit notes for this session" },
        { status: 403 }
      );
    }

    const updated = await prisma.meeting.update({
      where: { id: params.id },
      data: { notes: parsed.data.notes },
    });

    return NextResponse.json({ success: true, notes: updated.notes });
  } catch (error) {
    logger.apiError(`/api/sessions/${params.id}/notes`, error);
    return NextResponse.json(
      { error: "Failed to save notes" },
      { status: 500 }
    );
  }
}
