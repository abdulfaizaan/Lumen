import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { ratelimit } from "@/lib/ratelimit";
import { registerSchema, formatZodErrors } from "@/lib/validations";
import { logger } from "@/lib/logger";

export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for") ?? "anonymous";
    const { success } = await ratelimit.limit(`register_${ip}`);

    if (!success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    const body = await req.json();

    // ── Validate input with Zod ──────────────────────────────────
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(formatZodErrors(parsed.error), { status: 400 });
    }

    const { name, email, password, inviteCode } = parsed.data;

    // ── Determine role server-side ───────────────────────────────
    // Role is NEVER trusted from the client. It is derived from the invite code.
    let role: "CUSTOMER" | "AGENT" = "CUSTOMER";

    if (inviteCode) {
      const validInviteCode = process.env.AGENT_INVITE_CODE;
      if (!validInviteCode || inviteCode !== validInviteCode) {
        logger.authFailure("Invalid agent invite code", { email, ip });
        return NextResponse.json(
          { error: "Invalid invite code" },
          { status: 403 }
        );
      }
      role = "AGENT";
    }

    // ── Check for existing user ──────────────────────────────────
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Email is already registered" },
        { status: 400 }
      );
    }

    // ── Create user ──────────────────────────────────────────────
    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
      },
    });

    logger.info("User registered", { userId: user.id, role, email });

    return NextResponse.json(
      {
        message: "User registered successfully",
        user: { id: user.id, email: user.email, role: user.role },
      },
      { status: 201 }
    );
  } catch (error) {
    logger.apiError("/api/auth/register", error);
    return NextResponse.json(
      { error: "Failed to register user" },
      { status: 500 }
    );
  }
}
