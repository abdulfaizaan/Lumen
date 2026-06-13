import { PrismaClient, UserRole, SessionStatus, SupportRequestStatus, RecordingStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config({ path: '.env.local' });
dotenv.config();

const prisma = new PrismaClient();

async function seedDashboard() {
  console.log("Seeding historical data for the dashboard...");

  const hashedPassword = await bcrypt.hash("demo123", 10);

  // 1. Ensure Demo Users Exist
  console.log("Ensuring demo users exist...");
  const admin = await prisma.user.upsert({
    where: { email: "admin@lumen.com" },
    update: {},
    create: { name: "Admin Demo", email: "admin@lumen.com", password: hashedPassword, role: UserRole.ADMIN },
  });

  const agent1 = await prisma.user.upsert({
    where: { email: "agent1@lumen.com" },
    update: {},
    create: { name: "Sarah Jenkins (Agent)", email: "agent1@lumen.com", password: hashedPassword, role: UserRole.AGENT },
  });

  const agent2 = await prisma.user.upsert({
    where: { email: "agent2@lumen.com" },
    update: {},
    create: { name: "Marcus Rossi (Agent)", email: "agent2@lumen.com", password: hashedPassword, role: UserRole.AGENT },
  });

  const customer1 = await prisma.user.upsert({
    where: { email: "cust1@lumen.com" },
    update: {},
    create: { name: "John Doe", email: "cust1@lumen.com", password: hashedPassword, role: UserRole.CUSTOMER },
  });

  const customer2 = await prisma.user.upsert({
    where: { email: "cust2@lumen.com" },
    update: {},
    create: { name: "Jane Smith", email: "cust2@lumen.com", password: hashedPassword, role: UserRole.CUSTOMER },
  });

  // 2. Create Historical Support Requests
  console.log("Creating historical support requests...");
  const sr1 = await prisma.supportRequest.create({
    data: {
      customerId: customer1.id,
      customerName: customer1.name!,
      issueSummary: "Laptop screen is flickering intermittently when connected to external monitor.",
      priority: 2,
      status: SupportRequestStatus.CLOSED,
      assignedToId: agent1.id,
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 3600000), // 1 hour later
    }
  });

  const sr2 = await prisma.supportRequest.create({
    data: {
      customerId: customer2.id,
      customerName: customer2.name!,
      issueSummary: "Billing issue: Double charged for monthly subscription.",
      priority: 3,
      status: SupportRequestStatus.CLOSED,
      assignedToId: agent2.id,
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 1800000), // 30 mins later
    }
  });

  const sr3 = await prisma.supportRequest.create({
    data: {
      customerId: customer1.id,
      customerName: customer1.name!,
      issueSummary: "Can't connect to the company VPN from home Wi-Fi.",
      priority: 1,
      status: SupportRequestStatus.ACTIVE,
      assignedToId: agent1.id,
      createdAt: new Date(Date.now() - 1000000), // very recently
      updatedAt: new Date(),
    }
  });

  // 3. Create Historical Meetings (Calls)
  console.log("Creating historical meetings...");
  
  // Meeting 1: Hardware Issue (Closed)
  const meeting1 = await prisma.meeting.create({
    data: {
      status: SessionStatus.ENDED,
      agentId: agent1.id,
      customerId: customer1.id,
      customerName: customer1.name,
      joinToken: crypto.randomUUID(),
      meetingId: crypto.randomUUID(),
      passcode: "123456",
      supportRequestId: sr1.id,
      notes: "Customer showed flickering screen via camera. Reinstalled display drivers. Issue resolved.",
      csatScore: 5,
      csatFeedback: "Sarah was incredibly helpful and solved my problem in 10 minutes!",
      sentimentScore: 0.9,
      frustrationLevel: "Low",
      summaryProblem: "Flickering screen on external monitor.",
      summaryActions: "Reinstalled Intel Graphics drivers.",
      summaryResolution: "Flickering stopped. Monitored for 5 minutes.",
      summaryFollowUp: "None needed.",
      startedAt: sr1.createdAt,
      endedAt: sr1.updatedAt,
      durationSeconds: 900, // 15 mins
      createdAt: sr1.createdAt,
      updatedAt: sr1.updatedAt,
    }
  });

  // Add messages for Meeting 1
  await prisma.message.createMany({
    data: [
      { sessionId: meeting1.id, senderId: customer1.id, senderRole: UserRole.CUSTOMER, content: "Hi, my screen keeps flickering.", createdAt: new Date(meeting1.startedAt!.getTime() + 10000) },
      { sessionId: meeting1.id, senderId: agent1.id, senderRole: UserRole.AGENT, content: "Hello! Let's get that fixed. Could you share your screen?", createdAt: new Date(meeting1.startedAt!.getTime() + 20000) },
      { sessionId: meeting1.id, senderId: customer1.id, senderRole: UserRole.CUSTOMER, content: "Done.", createdAt: new Date(meeting1.startedAt!.getTime() + 30000) },
      { sessionId: meeting1.id, senderId: agent1.id, senderRole: UserRole.AGENT, content: "Great. I see the issue. I am sending you a link to the latest driver.", createdAt: new Date(meeting1.startedAt!.getTime() + 60000) },
    ]
  });

  // Add Transcript for Meeting 1
  await prisma.transcript.createMany({
    data: [
      { sessionId: meeting1.id, participantIdentity: customer1.id, participantName: customer1.name, text: "Yeah, it just flickers every time I move the mouse.", timestamp: new Date(meeting1.startedAt!.getTime() + 15000) },
      { sessionId: meeting1.id, participantIdentity: agent1.id, participantName: agent1.name, text: "I understand. Let's try reinstalling the driver.", timestamp: new Date(meeting1.startedAt!.getTime() + 25000) },
    ]
  });

  // Add Recording for Meeting 1
  await prisma.recording.create({
    data: {
      sessionId: meeting1.id,
      status: RecordingStatus.READY,
      fileUrl: "https://example.com/recording1.mp4",
      duration: 900,
      createdAt: meeting1.startedAt!,
      updatedAt: meeting1.endedAt!
    }
  });

  // Add Support Ticket for Meeting 1
  await prisma.supportTicket.create({
    data: {
      sessionId: meeting1.id,
      category: "Hardware",
      priority: "Medium",
      issue: "Flickering screen on external monitor",
      resolution: "Reinstalled display drivers. Issue resolved.",
      status: "Closed",
      confidenceScore: 0.95,
      createdAt: meeting1.endedAt!,
      updatedAt: meeting1.endedAt!
    }
  });


  // Meeting 2: Billing Issue (Closed)
  const meeting2 = await prisma.meeting.create({
    data: {
      status: SessionStatus.ENDED,
      agentId: agent2.id,
      customerId: customer2.id,
      customerName: customer2.name,
      joinToken: crypto.randomUUID(),
      meetingId: crypto.randomUUID(),
      passcode: "654321",
      supportRequestId: sr2.id,
      notes: "Refunded $49.99 duplicate charge. Customer was highly upset but calmed down after refund.",
      csatScore: 3,
      csatFeedback: "Refund was fast but this shouldn't have happened.",
      sentimentScore: -0.4,
      frustrationLevel: "High",
      summaryProblem: "Duplicate charge of $49.99 for monthly plan.",
      summaryActions: "Checked Stripe logs, verified duplicate charge, issued refund.",
      summaryResolution: "Refund processed. Will appear in 3-5 days.",
      summaryFollowUp: "Send email confirmation of refund.",
      startedAt: sr2.createdAt,
      endedAt: sr2.updatedAt,
      durationSeconds: 1200, // 20 mins
      createdAt: sr2.createdAt,
      updatedAt: sr2.updatedAt,
    }
  });

  // Add Recording for Meeting 2
  await prisma.recording.create({
    data: {
      sessionId: meeting2.id,
      status: RecordingStatus.READY,
      fileUrl: "https://example.com/recording2.mp4",
      duration: 1200,
      createdAt: meeting2.startedAt!,
      updatedAt: meeting2.endedAt!
    }
  });

  // Add Support Ticket for Meeting 2
  await prisma.supportTicket.create({
    data: {
      sessionId: meeting2.id,
      category: "Billing",
      priority: "High",
      issue: "Double charged for monthly subscription",
      resolution: "Refunded duplicate charge of $49.99.",
      status: "Closed",
      confidenceScore: 0.88,
      createdAt: meeting2.endedAt!,
      updatedAt: meeting2.endedAt!
    }
  });


  // Meeting 3: VPN Issue (Active)
  const meeting3 = await prisma.meeting.create({
    data: {
      status: SessionStatus.ACTIVE,
      agentId: agent1.id,
      customerId: customer1.id,
      customerName: customer1.name,
      joinToken: crypto.randomUUID(),
      meetingId: crypto.randomUUID(),
      passcode: "777888",
      supportRequestId: sr3.id,
      sentimentScore: 0.1,
      frustrationLevel: "Medium",
      startedAt: sr3.createdAt,
      createdAt: sr3.createdAt,
      updatedAt: sr3.updatedAt,
    }
  });

  console.log("Historical dashboard data seeded successfully!");
}

seedDashboard().catch(console.error).finally(() => prisma.$disconnect());
