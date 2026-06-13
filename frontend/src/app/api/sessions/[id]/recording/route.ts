import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { logger } from "@/lib/logger";
import { EgressClient, EncodedFileOutput, EncodedFileType, S3Upload } from "livekit-server-sdk";

const egressClient = new EgressClient(
  process.env.LIVEKIT_URL || "https://placeholder.livekit.cloud",
  process.env.LIVEKIT_API_KEY,
  process.env.LIVEKIT_API_SECRET
);

// GET /api/sessions/[id]/recording — Get recording status
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
    const recordings = await prisma.recording.findMany({
      where: { sessionId: params.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ recordings });
  } catch (error) {
    logger.apiError(`/api/sessions/${params.id}/recording GET`, error);
    return NextResponse.json(
      { error: "Failed to fetch recordings" },
      { status: 500 }
    );
  }
}

// POST /api/sessions/[id]/recording — Start or stop recording (Actual LiveKit Egress)
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

    // Only the agent can control recording
    if (meeting.agentId !== session.user.id) {
      return NextResponse.json(
        { error: "Only the agent can control recording" },
        { status: 403 }
      );
    }

    const { action, recordingId } = await req.json();

    if (action === "start") {
      // Check if there's already an active recording
      const activeRecording = await prisma.recording.findFirst({
        where: { sessionId: params.id, status: "RECORDING" },
      });

      if (activeRecording) {
        return NextResponse.json(
          { error: "Recording already in progress" },
          { status: 409 }
        );
      }

      // Generate a unique filename for S3/Supabase Storage
      const filename = `recordings/${params.id}/${Date.now()}.mp4`;

      // Start the RoomComposite Egress on LiveKit Cloud
      const info = await egressClient.startRoomCompositeEgress(
        params.id, // room name
        {
          file: new EncodedFileOutput({
            filepath: filename,
            fileType: EncodedFileType.MP4,
            output: {
              case: 's3',
              value: new S3Upload({
                accessKey: process.env.S3_ACCESS_KEY || "",
                secret: process.env.S3_SECRET_KEY || "",
                region: process.env.S3_REGION || "us-east-1",
                bucket: process.env.S3_BUCKET || "lumen-storage",
                endpoint: process.env.S3_ENDPOINT || "",
              })
            }
          }),
        },
        { layout: "grid" }
      );

      // Create record with the LiveKit Egress ID
      const recording = await prisma.recording.create({
        data: {
          id: info.egressId, // Store Egress ID for tracking
          sessionId: params.id,
          status: "RECORDING",
        },
      });

      await prisma.sessionEvent.create({
        data: {
          sessionId: params.id,
          eventType: "RECORDING_STARTED",
          userId: session.user.id,
        },
      });

      logger.recordingStarted(params.id, recording.id);

      return NextResponse.json(recording, { status: 201 });
      
    } else if (action === "stop") {
      if (!recordingId) {
        return NextResponse.json(
          { error: "recordingId is required to stop" },
          { status: 400 }
        );
      }

      const activeRecording = await prisma.recording.findUnique({
        where: { id: recordingId },
      });

      if (!activeRecording) {
        return NextResponse.json(
          { error: "Recording not found" },
          { status: 404 }
        );
      }

      // Stop the Egress process on LiveKit Cloud
      await egressClient.stopEgress(recordingId);

      const updated = await prisma.recording.update({
        where: { id: recordingId },
        data: {
          status: "PROCESSING",
        },
      });

      await prisma.sessionEvent.create({
        data: {
          sessionId: params.id,
          eventType: "RECORDING_STOPPED",
          userId: session.user.id,
        },
      });

      logger.recordingStopped(params.id, recordingId);

      // The status will transition to "ready" when LiveKit sends the webhook
      return NextResponse.json(updated);
    }

    return NextResponse.json(
      { error: 'Invalid action. Use "start" or "stop"' },
      { status: 400 }
    );
  } catch (error) {
    logger.apiError(`/api/sessions/${params.id}/recording POST`, error);
    return NextResponse.json(
      { error: "Failed to control recording" },
      { status: 500 }
    );
  }
}
