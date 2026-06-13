import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";

export async function POST() {
  // Only for development/demo
  if (process.env.NODE_ENV === "production" && !process.env.ALLOW_DEMO_SEED) {
    return NextResponse.json({ error: "Forbidden in production" }, { status: 403 });
  }

  try {
    // We assume some agents exist, fetch the first one
    const agent = await prisma.user.findFirst({ where: { role: "AGENT" } });
    if (!agent) {
      return NextResponse.json({ error: "No agent found to assign demo data" }, { status: 400 });
    }

    // 1. Clean existing AI data if we want to reset (optional, but good for idempotent seeds)
    await prisma.supportTicket.deleteMany();
    await prisma.transcript.deleteMany();
    await prisma.sessionEvent.deleteMany();

    // 2. Generate 50 Support Requests
    for (let i = 0; i < 50; i++) {
      const isResolved = Math.random() > 0.3; // 70% resolved
      
      const meeting = await prisma.meeting.create({
        data: {
          agentId: agent.id,
          status: isResolved ? "ENDED" : "ACTIVE",
          customerName: `Customer ${i}`,
          joinToken: randomUUID().substring(0, 16),
          meetingId: (100000000 + i).toString(),
          passcode: "123456",
          durationSeconds: isResolved ? Math.floor(Math.random() * 600) + 120 : 0,
          csatScore: isResolved ? (Math.random() > 0.2 ? 5 : 3) : null,
          sentimentScore: Math.random(), // 0 to 1
          frustrationLevel: Math.random() > 0.8 ? "HIGH" : Math.random() > 0.5 ? "MEDIUM" : "LOW",
          summaryProblem: "Customer reported network connectivity issues.",
          summaryActions: "Agent guided through router reboot and firmware update.",
          summaryResolution: isResolved ? "Resolved successfully after reboot." : "Escalated to Tier 2.",
          createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Random past 7 days
        }
      });

      // Generate Ticket
      await prisma.supportTicket.create({
        data: {
          sessionId: meeting.id,
          category: ["Network", "Hardware", "Billing", "Software"][Math.floor(Math.random() * 4)],
          priority: ["Low", "Medium", "High", "Critical"][Math.floor(Math.random() * 4)],
          issue: "Connectivity loss",
          resolution: isResolved ? "Resolved" : "Pending",
          status: isResolved ? "Closed" : "Open",
          confidenceScore: 0.8 + Math.random() * 0.15,
        }
      });

      // Generate a few transcripts
      for (let j = 0; j < 5; j++) {
        await prisma.transcript.create({
          data: {
            sessionId: meeting.id,
            participantIdentity: j % 2 === 0 ? "Customer" : "Agent",
            text: j % 2 === 0 ? "My internet is down." : "Let me check that for you.",
          }
        });
      }
    }

    return NextResponse.json({ success: true, message: "Demo data seeded successfully!" });
  } catch (error) {
    console.error("Demo seed failed", error);
    return NextResponse.json({ error: "Failed to seed demo data" }, { status: 500 });
  }
}
