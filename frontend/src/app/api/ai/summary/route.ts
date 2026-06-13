import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { logger } from "@/lib/logger";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || "dummy_key");

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

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash", generationConfig: { responseMimeType: "application/json" } });
    const fullPrompt = `You are an AI Support Manager. Always respond with valid JSON matching the requested structure.\n\n${prompt}`;
    
    const response = await model.generateContent(fullPrompt);

    const result = JSON.parse(response.response.text() || "{}");

    return NextResponse.json(result);
  } catch (error) {
    logger.error("AI Summary Error", { error });
    return NextResponse.json(
      { error: "Failed to generate session summary" },
      { status: 500 }
    );
  }
}
