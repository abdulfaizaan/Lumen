import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { ratelimit } from "@/lib/ratelimit";
import { auth } from "@/auth";
import { sessionJoinSchema, formatZodErrors } from "@/lib/validations";
import { logger } from "@/lib/logger";

export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for") ?? "anonymous";
    const { success } = await ratelimit.limit(`validate_${ip}`);

    if (!success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    const body = await req.json();

    // ── Validate input ───────────────────────────────────────────
    const parsed = sessionJoinSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(formatZodErrors(parsed.error), { status: 400 });
    }

    const { meetingId, passcode } = parsed.data;

    const sessionAuth = await auth();

    const meeting = await prisma.meeting.findFirst({
      where: {
        meetingId: meetingId,
        passcode: passcode,
      },
    });

    if (!meeting) {
      logger.authFailure("Invalid meeting credentials", { meetingId, ip });
      return NextResponse.json(
        { error: "Invalid meeting ID or passcode" },
        { status: 401 }
      );
    }

    if (meeting.status === "ENDED" || meeting.status === "FAILED") {
      return NextResponse.json(
        { error: "This session has already ended" },
        { status: 410 }
      );
    }

    // ── Link customer to meeting & track events ──────────────────
    const updateData: Record<string, unknown> = {};

    if (sessionAuth?.user?.id && sessionAuth.user.id !== meeting.agentId) {
      updateData.customerId = sessionAuth.user.id;
      updateData.customerName = sessionAuth.user.name || "Customer";
    }

    // Set startedAt and status on first join
    if (!meeting.startedAt) {
      updateData.startedAt = new Date();
      updateData.status = "ACTIVE";
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.meeting.update({
        where: { id: meeting.id },
        data: updateData,
      });
    }

    // ── Create join event ────────────────────────────────────────
    await prisma.sessionEvent.create({
      data: {
        sessionId: meeting.id,
        eventType: "PARTICIPANT_JOINED",
        userId: sessionAuth?.user?.id || null,
        metadata: JSON.stringify({
          name: sessionAuth?.user?.name || "Guest",
          role: sessionAuth?.user?.id === meeting.agentId ? "AGENT" : "CUSTOMER",
        }),
      },
    });

    logger.sessionJoined(
      meeting.id,
      sessionAuth?.user?.id || "guest",
      sessionAuth?.user?.id === meeting.agentId ? "AGENT" : "CUSTOMER"
    );

    const cookieStore = await cookies();
    
    // Create HMAC signature for the cookie to prevent forgery
    const secret = process.env.AUTH_SECRET || "fallback-secret-do-not-use-in-prod";
    const crypto = await import("crypto");
    const signature = crypto.createHmac("sha256", secret).update(meeting.joinToken).digest("hex");
    const cookieValue = `${meeting.joinToken}.${signature}`;

    cookieStore.set(`validated_${meeting.joinToken}`, cookieValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 2,
    });

    return NextResponse.json({
      success: true,
      joinToken: meeting.joinToken,
    });
  } catch (error) {
    logger.apiError("/api/sessions/validate", error);
    return NextResponse.json(
      { error: "Failed to validate session" },
      { status: 500 }
    );
  }
}
