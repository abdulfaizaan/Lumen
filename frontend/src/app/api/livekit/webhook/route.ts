// Trigger TS refresh
import { NextResponse } from "next/server";
import { WebhookReceiver } from "livekit-server-sdk";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

const receiver = new WebhookReceiver(
  process.env.LIVEKIT_API_KEY || "",
  process.env.LIVEKIT_API_SECRET || ""
);

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const signature = req.headers.get("Authorization");

    if (!signature) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const event = await receiver.receive(body, signature);

    logger.info("Received LiveKit webhook", { event: event.event });

    if (event.event === "egress_ended") {
      const egressInfo = event.egressInfo;
      if (!egressInfo) {
        return new NextResponse("No egress info", { status: 400 });
      }

      const status = egressInfo.status === 3 ? "READY" : "FAILED"; // 3 = EGRESS_COMPLETE
      let fileUrl = null;
      let duration = 0;

      if (egressInfo.fileResults && egressInfo.fileResults.length > 0) {
        // fileResults[0].location will contain the S3 public/presigned URL 
        // if configured correctly in LiveKit Cloud. We store this directly.
        fileUrl = egressInfo.fileResults[0].location;
        duration = Math.floor(Number(egressInfo.fileResults[0].duration) / 1000000000); // ns to s
      }

      await prisma.recording.updateMany({
        where: { id: egressInfo.egressId },
        data: {
          status,
          fileUrl,
          duration,
        },
      });

      logger.info(`Recording ${egressInfo.egressId} processed`, { status, fileUrl });
    }

    return new NextResponse("OK", { status: 200 });
  } catch (error) {
    logger.error("Failed to process LiveKit webhook", { error });
    return new NextResponse("Internal Error", { status: 500 });
  }
}
