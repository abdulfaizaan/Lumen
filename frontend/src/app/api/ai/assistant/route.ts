import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { logger } from "@/lib/logger";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || "dummy_key");

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

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `You are an expert technical support assistant helping a live agent. The agent will give you a brief symptom or query. Return a concise, structured response containing: 1) Likely Issue, 2) Step-by-Step Troubleshooting, 3) Documentation Links if applicable. Keep it brief and actionable, as the agent is on a live video call.\n\nQuery:\n${query}`;
    
    const response = await model.generateContent(prompt);

    return NextResponse.json({ suggestion: response.response.text() });
  } catch (error) {
    logger.error("AI Assistant Error", { error });
    return NextResponse.json(
      { error: "Failed to generate suggestion" },
      { status: 500 }
    );
  }
}
