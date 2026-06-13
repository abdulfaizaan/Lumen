import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Ticket Categories
    const tickets = await prisma.supportTicket.findMany({
      select: { category: true }
    });
    const categoryCounts = tickets.reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const ticketData = Object.entries(categoryCounts).map(([name, value]) => ({ name, value }));

    // 2. Sentiment Over Time (Last 10 meetings)
    const meetings = await prisma.meeting.findMany({
      where: { sentimentScore: { not: null } },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { createdAt: true, sentimentScore: true }
    });
    
    // Reverse to chronological order
    const sentimentData = meetings.reverse().map(m => ({
      date: new Date(m.createdAt).toLocaleDateString(),
      sentiment: Math.round(m.sentimentScore! * 100) // 0-100 scale
    }));

    return NextResponse.json({ ticketData, sentimentData });
  } catch (error) {
    console.error("Failed to fetch analytics", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
