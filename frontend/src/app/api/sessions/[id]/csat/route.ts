import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export async function POST(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const { rating, feedback } = await req.json();

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Invalid rating" }, { status: 400 });
    }

    const meeting = await prisma.meeting.update({
      where: { id: params.id },
      data: {
        csatScore: rating,
        csatFeedback: feedback || null,
      },
    });

    logger.info("CSAT collected", { sessionId: params.id, rating });

    return NextResponse.json(meeting);
  } catch (error) {
    logger.apiError(`/api/sessions/${params.id}/csat POST`, error);
    return NextResponse.json(
      { error: "Failed to submit CSAT" },
      { status: 500 }
    );
  }
}
