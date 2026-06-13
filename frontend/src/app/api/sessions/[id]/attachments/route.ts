import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { logger } from "@/lib/logger";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const s3Client = new S3Client({
  region: process.env.S3_REGION || "us-east-1",
  endpoint: process.env.S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY || "",
    secretAccessKey: process.env.S3_SECRET_KEY || "",
  },
  forcePathStyle: true,
});

const BUCKET_NAME = process.env.S3_BUCKET || "lumen-storage";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, "1 m"), // 5 uploads per minute
  analytics: true,
});

// GET /api/sessions/[id]/attachments — List attachments
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
    const attachments = await prisma.attachment.findMany({
      where: { sessionId: params.id },
      orderBy: { createdAt: "desc" },
      include: {
        sender: { select: { id: true, name: true, role: true } },
      },
    });

    return NextResponse.json({ attachments });
  } catch (error) {
    logger.apiError(`/api/sessions/${params.id}/attachments GET`, error);
    return NextResponse.json(
      { error: "Failed to fetch attachments" },
      { status: 500 }
    );
  }
}

// POST /api/sessions/[id]/attachments — Upload a file to Supabase
export async function POST(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate Limiting
  const ip = req.headers.get("x-forwarded-for") || "unknown";
  const { success } = await ratelimit.limit(`upload_${ip}`);
  if (!success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const meeting = await prisma.meeting.findUnique({
      where: { id: params.id },
    });

    if (!meeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    if (
      meeting.agentId !== session.user.id &&
      meeting.customerId !== session.user.id
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = [
      "application/pdf",
      "image/png",
      "image/jpeg",
      "image/jpg",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "File type not supported. Allowed: PDF, PNG, JPG, DOCX" },
        { status: 400 }
      );
    }

    // Validate file size (10MB max)
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File size must be under 10MB" },
        { status: 400 }
      );
    }

    // Convert to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Sanitize and generate unique path
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const uniquePath = `${params.id}/${Date.now()}_${sanitizedName}`;

    // Upload to S3/Cloudflare R2
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: uniquePath,
      Body: buffer,
      ContentType: file.type,
    });

    await s3Client.send(command);

    // Get public URL (Assuming bucket is public, or forming endpoint URL)
    let publicUrl = "";
    if (process.env.S3_PUBLIC_URL) {
      publicUrl = `${process.env.S3_PUBLIC_URL}/${uniquePath}`;
    } else {
      // Fallback crude URL construct
      const endpointStr = process.env.S3_ENDPOINT || `https://s3.${process.env.S3_REGION || 'us-east-1'}.amazonaws.com`;
      publicUrl = `${endpointStr}/${BUCKET_NAME}/${uniquePath}`;
    }

    // Save to database
    const attachment = await prisma.attachment.create({
      data: {
        sessionId: params.id,
        senderId: session.user.id,
        fileName: file.name,
        fileUrl: publicUrl,
        fileType: file.type,
        fileSize: file.size,
      },
      include: {
        sender: { select: { id: true, name: true, role: true } },
      },
    });

    logger.info("Cloud file uploaded", {
      sessionId: params.id,
      fileName: file.name,
      fileSize: file.size,
    });

    return NextResponse.json(attachment, { status: 201 });
  } catch (error) {
    logger.apiError(`/api/sessions/${params.id}/attachments POST`, error);
    return NextResponse.json(
      { error: "Failed to upload file to cloud storage" },
      { status: 500 }
    );
  }
}
