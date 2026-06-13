import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { logger } from '../logger';
import { prisma } from '../prisma';
import OpenAI from 'openai';
import { AI_PROMPTS } from '../ai/prompts';
import { eventBus } from '../events/EventBus';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'dummy_key',
});

// Use UPSTASH_REDIS_REST_URL or standard REDIS_URL
const redisUrl = process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL;

const redisConnection = redisUrl ? new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
}) : null;

export const backgroundQueue = redisConnection ? new Queue('lumen-background-jobs', {
  connection: redisConnection as any
}) : null;

export function initWorker() {
  if (!redisConnection) {
    logger.warn('Skipping BullMQ Worker initialization (REDIS_URL not set).');
    return null;
  }

  const worker = new Worker('lumen-background-jobs', async job => {
    logger.info(`Processing background job ${job.id} of type ${job.name}`);
    
    switch (job.name) {
      case 'PROCESS_RECORDING':
        logger.info(`Processing recording for session: ${job.data.sessionId}`);
        break;
      
      case 'POST_CALL_ANALYSIS':
        logger.info(`Running Post-Call AI Analysis for session: ${job.data.sessionId}`);
        await runPostCallAnalysis(job.data.sessionId);
        break;

      case 'ANALYZE_SENTIMENT':
        logger.info(`Running Live Sentiment Analysis for session: ${job.data.sessionId}`);
        await runLiveSentimentAnalysis(job.data.sessionId);
        break;
        
      default:
        logger.warn(`Unknown job type: ${job.name}`);
    }
  }, {
    connection: redisConnection as any
  });

  worker.on('completed', job => {
    logger.info(`Job ${job.id} has completed!`);
  });

  worker.on('failed', (job, err) => {
    logger.error(`Job ${job?.id} has failed with ${err.message}`);
  });

  return worker;
}

// ─── AI Logic ──────────────────────────────────────────────────

function cosineSimilarity(vecA: number[], vecB: number[]) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function runPostCallAnalysis(sessionId: string) {
  try {
    const transcripts = await prisma.transcript.findMany({
      where: { sessionId },
      orderBy: { timestamp: 'asc' }
    });

    if (transcripts.length === 0) return;

    const transcriptText = transcripts.map(t => `${t.participantIdentity}: ${t.text}`).join('\n');

    if (process.env.OPENAI_API_KEY) {
      // 1. Generate Summary
      const summaryRes = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: AI_PROMPTS.sessionSummary },
          { role: "user", content: transcriptText }
        ],
        response_format: { type: "json_object" }
      });
      const summary = JSON.parse(summaryRes.choices[0].message.content || '{}');

      // 2. Generate Ticket
      const ticketRes = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: AI_PROMPTS.ticketGenerator },
          { role: "user", content: transcriptText }
        ],
        response_format: { type: "json_object" }
      });
      const ticket = JSON.parse(ticketRes.choices[0].message.content || '{}');

      // Update DB
      await prisma.meeting.update({
        where: { id: sessionId },
        data: {
          summaryProblem: summary.summaryProblem,
          summaryActions: summary.summaryActions,
          summaryResolution: summary.summaryResolution,
          summaryFollowUp: summary.summaryFollowUp,
        }
      });

      await prisma.supportTicket.create({
        data: {
          sessionId,
          category: ticket.category || 'General',
          priority: ticket.priority || 'Medium',
          issue: ticket.issue || 'Unknown',
          resolution: ticket.resolution || 'Pending',
          status: ticket.status || 'Open',
          confidenceScore: ticket.confidenceScore || 0.8
        }
      });
    } else {
      logger.warn("OPENAI_API_KEY not set. Skipping real AI generation.");
    }
  } catch (err: any) {
    logger.error("Failed post-call analysis", err);
  }
}

async function runLiveSentimentAnalysis(sessionId: string) {
  try {
    const recentTranscripts = await prisma.transcript.findMany({
      where: { sessionId },
      orderBy: { timestamp: 'desc' },
      take: 5
    });

    if (recentTranscripts.length === 0) return;
    
    // Reverse to chronological
    const text = recentTranscripts.reverse().map(t => `${t.participantIdentity}: ${t.text}`).join('\n');

    if (process.env.OPENAI_API_KEY) {
      const res = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: AI_PROMPTS.liveSentiment },
          { role: "user", content: text }
        ],
        response_format: { type: "json_object" }
      });
      
      const sentiment = JSON.parse(res.choices[0].message.content || '{}');
      
      // Emit to WebSockets
      eventBus.publish('AI_SENTIMENT_UPDATE', {
        sessionId,
        ...sentiment
      });

      // Mathematical RAG Integration
      let kbContext = "No relevant knowledge base articles found.";
      try {
        const embedRes = await openai.embeddings.create({
          model: "text-embedding-3-small",
          input: text
        });
        const queryEmbedding = embedRes.data[0].embedding;

        const articles = await prisma.knowledgeArticle.findMany();
        if (articles.length > 0) {
          const scoredArticles = articles.map(article => ({
            ...article,
            score: cosineSimilarity(queryEmbedding, (article as any).embedding)
          })).sort((a, b) => b.score - a.score);

          const topDocs = scoredArticles.slice(0, 2);
          kbContext = topDocs.map(d => `Title: ${d.title}\nContent: ${d.content}`).join('\n\n');
        }
      } catch (err: any) {
        logger.error("Failed to perform RAG search", err);
      }

      // Real Agent Assist AI Call
      const assistRes = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: AI_PROMPTS.agentAssist },
          { role: "user", content: `Customer Transcript:\n${text}\n\nInternal Knowledge Base:\n${kbContext}` }
        ],
        response_format: { type: "json_object" }
      });
      
      const assistData = JSON.parse(assistRes.choices[0].message.content || '{}');
      
      if (assistData.recommendation) {
        eventBus.publish('AI_AGENT_ASSIST', {
          sessionId,
          recommendation: assistData.recommendation
        });
      }

    }
  } catch (err: any) {
    logger.error("Failed live sentiment analysis", err);
  }
}

