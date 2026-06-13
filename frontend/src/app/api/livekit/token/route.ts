import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { AccessToken } from "livekit-server-sdk";
import { auth } from "@/auth";
import { logger } from "@/lib/logger";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const room = url.searchParams.get("room");
  const participantName = url.searchParams.get("participantName") || "Anonymous";

  if (!room) {
    return NextResponse.json(
      { error: 'Missing "room" query parameter' },
      { status: 400 }
    );
  }

  // ── Look up the meeting ────────────────────────────────────────
  // We first try to find by ID, if not, by joinToken
  let meeting = await prisma.meeting.findUnique({ where: { id: room } });
  if (!meeting) {
    meeting = await prisma.meeting.findUnique({ where: { joinToken: room } });
  }

  if (!meeting) {
    return NextResponse.json(
      { error: "Invalid room or session token" },
      { status: 404 }
    );
  }

  // ── Derive role from authenticated session — NEVER from query params ──
  const session = await auth();

  let isAgent = false;
  let participantIdentity: string;

  if (session?.user?.id) {
    // Authenticated user — check if they're the agent for this meeting
    if (session.user.id === meeting.agentId) {
      isAgent = true;
      participantIdentity = `agent_${session.user.id}`;
    } else {
      // Authenticated customer (or any non-agent user)
      participantIdentity = `customer_${session.user.id}`;
    }
  } else {
    // Unauthenticated — must be joining via joinToken
    const joinToken = url.searchParams.get("room");
    if (!joinToken) {
      return NextResponse.json(
        { error: "Missing session token" },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const isValidatedCookie = cookieStore.get(`validated_${joinToken}`);
    if (!isValidatedCookie) {
      return NextResponse.json(
        { error: "Unauthorized access. Please join via the validation page." },
        { status: 403 }
      );
    }

    // Verify HMAC signature
    const secret = process.env.AUTH_SECRET || "fallback-secret-do-not-use-in-prod";
    const crypto = await import("crypto");
    const expectedSignature = crypto.createHmac("sha256", secret).update(joinToken).digest("hex");
    const expectedCookieValue = `${joinToken}.${expectedSignature}`;

    if (isValidatedCookie.value !== expectedCookieValue) {
      logger.authFailure("Cookie signature mismatch", { joinToken });
      return NextResponse.json(
        { error: "Invalid session validation signature." },
        { status: 403 }
      );
    }

    participantIdentity = `guest_${Date.now()}`;
  }

  // ── LiveKit credentials ────────────────────────────────────────
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const wsUrl = process.env.LIVEKIT_URL;

  if (!apiKey || !apiSecret || !wsUrl) {
    return NextResponse.json(
      { error: "LiveKit credentials are not configured" },
      { status: 500 }
    );
  }

  const roomId = meeting.id;

  // ── Generate token with role-appropriate permissions ────────────
  const at = new AccessToken(apiKey, apiSecret, {
    identity: participantIdentity,
    name: participantName,
  });

  at.addGrant({
    room: roomId,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
    // Only agents get room admin (needed for recording, ejecting)
    roomAdmin: isAgent,
    roomRecord: isAgent,
  });

  const token = await at.toJwt();

  logger.info("LiveKit token generated", {
    roomId,
    identity: participantIdentity,
    isAgent,
    meetingId: meeting.meetingId,
  });

  return NextResponse.json({
    token,
    roomId,
    livekitUrl: wsUrl,
    isAgent,
  });
}
