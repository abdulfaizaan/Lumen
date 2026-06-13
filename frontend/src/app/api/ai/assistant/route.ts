import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { OpenAI } from "openai";
import { logger } from "@/lib/logger";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "AGENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { query } = await req.json();

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are an expert technical support assistant helping a live agent. The agent will give you a brief symptom or query. Return a concise, structured response containing: 1) Likely Issue, 2) Step-by-Step Troubleshooting, 3) Documentation Links if applicable. Keep it brief and actionable, as the agent is on a live video call.",
        },
        {
          role: "user",
          content: query,
        },
      ],
      temperature: 0.3,
      max_tokens: 300,
    });

    return NextResponse.json({ suggestion: response.choices[0].message.content });
  } catch (error) {
    logger.error("AI Assistant Error", { error });
    return NextResponse.json(
      { error: "Failed to generate suggestion" },
      { status: 500 }
    );
  }
}
