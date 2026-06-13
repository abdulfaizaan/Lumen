import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
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
    const { participantIdentity, participantName, text, isFinal } = await req.json();

    if (!text) {
      return NextResponse.json({ error: "No text provided" }, { status: 400 });
    }

    // Save transcript to DB
    const transcript = await prisma.transcript.create({
      data: {
        sessionId: params.id,
        participantIdentity,
        participantName,
        text,
        isFinal: isFinal ?? true,
      },
    });

    // Every N final transcripts or every few seconds, we could trigger Live Sentiment analysis
    if (isFinal) {
      eventBus.publish('TRANSCRIPT_RECEIVED', {
        sessionId: params.id,
        transcript
      });

      // Async offload to BullMQ for sentiment analysis
      // To avoid spamming OpenAI, we could add logic to only queue if last sentiment check was > 5s ago
      // For hackathon demo, we'll queue it.
      await backgroundQueue.add('ANALYZE_SENTIMENT', { sessionId: params.id });
    }

    return NextResponse.json(transcript, { status: 201 });
  } catch (error) {
    console.error(`Failed to save transcript for session ${params.id}`, error);
    return NextResponse.json(
      { error: "Failed to save transcript" },
      { status: 500 }
    );
  }
}

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
    const transcripts = await prisma.transcript.findMany({
      where: { sessionId: params.id },
      orderBy: { timestamp: "asc" },
    });

    return NextResponse.json({ transcripts });
  } catch (error) {
    console.error(`Failed to fetch transcripts for session ${params.id}`, error);
    return NextResponse.json(
      { error: "Failed to fetch transcripts" },
      { status: 500 }
    );
  }
}
