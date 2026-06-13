

import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';
import dotenv from 'dotenv';

// Load .env if run standalone
dotenv.config({ path: '.env.local' });
dotenv.config();

const prisma = new PrismaClient();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const articles = [
  {
    title: "Internet Connectivity Troubleshooting Guide",
    content: "If a customer's internet is down, first check the physical connection. If the physical connection is fine, ask them to reboot the router. If rebooting fails, check for localized ISP outages. If no outages are reported, escalate to Tier 2 support.",
    tags: ["network", "internet", "router", "troubleshooting"]
  },
  {
    title: "Password Reset Policy",
    content: "To reset a customer's password, verify their identity using their security question or a 2FA code sent to their registered mobile number. Do NOT email passwords. If identity is verified, send a secure password reset link to their registered email address.",
    tags: ["security", "password", "account", "login"]
  },
  {
    title: "Billing and Refund Policy",
    content: "Customers are eligible for a full refund if requested within 14 days of the billing cycle. Partial refunds are granted for downtime exceeding 24 hours. Always check the downtime logs before processing a refund. Route refund requests over $100 to the Billing Manager.",
    tags: ["billing", "refund", "finance", "policy"]
  },
  {
    title: "Hardware Replacement Procedure",
    content: "If a router or modem is confirmed defective, process a hardware replacement ticket (RMA). Inform the customer that a replacement unit will arrive in 3-5 business days. Send a return label to their email for the defective unit.",
    tags: ["hardware", "router", "modem", "replacement", "RMA"]
  },
  {
    title: "Latency and Ping Issues",
    content: "If a customer complains about high ping or latency in games, verify they are using an Ethernet connection, not Wi-Fi. Check line noise levels using the diagnostic tool. High latency is often caused by network congestion during peak hours.",
    tags: ["network", "latency", "ping", "gaming"]
  }
];

async function seed() {
  if (!process.env.OPENAI_API_KEY) {
    console.warn("OPENAI_API_KEY is missing. Skipping KB seed.");
    return;
  }

  console.log('Clearing existing KB...');
  await prisma.knowledgeArticle.deleteMany();

  console.log('Seeding Knowledge Base with embeddings...');

  for (const doc of articles) {
    const res = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: doc.title + " " + doc.content,
    });

    await prisma.knowledgeArticle.create({
      data: {
        title: doc.title,
        content: doc.content,
        tags: doc.tags,
        embedding: res.data[0].embedding,
      }
    });
    console.log(`Created: ${doc.title}`);
  }

  console.log('Seed complete.');
}

seed().catch(console.error).finally(() => prisma.$disconnect());
