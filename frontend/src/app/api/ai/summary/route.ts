import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { OpenAI } from "openai";
import { logger } from "@/lib/logger";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id || (session.user.role !== "AGENT" && session.user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { sessionId } = await req.json();

    const meeting = await prisma.meeting.findUnique({
      where: { id: sessionId },
      include: {
        messages: { orderBy: { createdAt: "asc" } },
      },
    });

    if (!meeting) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Build transcript
    const transcript = meeting.messages
      .map((m) => `[${m.senderRole}] ${m.content}`)
      .join("\n");

    const prompt = `
Analyze the following customer support session.
Agent Notes: ${meeting.notes || "None"}
Transcript:
${transcript || "No chat messages recorded."}

Provide a JSON response with the following structure:
{
  "problemIdentified": "Brief description of the core issue",
  "resolution": "How it was resolved, or what the current status is",
  "customerSentiment": "Positive, Neutral, or Negative",
  "actionItems": ["List of next steps or follow-ups"],
  "ticket": {
    "title": "A short, descriptive ticket title",
    "category": "Hardware, Software, Billing, or General",
    "severity": "Low, Medium, High, or Critical"
  }
}
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "You are an AI Support Manager. Always respond with valid JSON matching the requested structure.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.2,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");

    return NextResponse.json(result);
  } catch (error) {
    logger.error("AI Summary Error", { error });
    return NextResponse.json(
      { error: "Failed to generate session summary" },
      { status: 500 }
    );
  }
}
