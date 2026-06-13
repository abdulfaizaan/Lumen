# 🌟 LUMEN v4.0 — The AI-Powered Support Command Center

> **Notice to Judges:** We were unable to record a live demo video for our submission, so this README has been carefully crafted as a "text-based demo" and a deep-dive into the *making* of Lumen. We encourage you to follow the interactive Walkthrough below to experience it firsthand!

Lumen is a modern, enterprise-grade WebRTC customer support platform designed specifically for the AtomQuest Grand Finale. It transforms the traditional customer service experience by providing end-to-end media routing, an embedded AI-powered Knowledge Base (RAG) for agent assist, live closed captions, and comprehensive real-time analytics.

---

## 🛠️ The Making of Lumen (Architecture & Technical Decisions)

Building Lumen in a hackathon timeframe required making deliberate architectural choices to balance real-time performance with a beautiful, responsive user experience. 

### 1. The Real-Time Engine (WebRTC & SSE)
Traditional customer support tools rely heavily on polling, which creates a sluggish user experience. 
- **WebRTC for Media:** We chose **LiveKit** to handle all audio, video, and screen-sharing routing. Unlike simple peer-to-peer WebRTC, using a Selective Forwarding Unit (SFU) allows us to support multi-participant calls and server-side egress recording seamlessly.
- **Server-Sent Events (SSE) for State:** To keep the agent dashboards instantly synchronized without hammering the database, we implemented an SSE streaming architecture.

### 2. The AI Architecture (Mathematical RAG)
Most RAG implementations require spinning up a heavy vector database like Pinecone or PostgreSQL with `pgvector`. 
- **In-Memory Cosine Similarity:** To ensure 100% deployment compatibility and blazing-fast local performance during the hackathon, we implemented a custom mathematical RAG engine directly inside Node.js. The AI uses Cosine Similarity to instantly fetch relevant mock-company documentation to assist the agent based on the live context.
- **Asynchronous AI Processing:** Intensive LLM tasks like generating summaries and resolving ticket categories are offloaded to **BullMQ** and **Upstash Redis**. This keeps our Next.js API routes blazingly fast and non-blocking.

### 3. The Frontend Stack (Next.js App Router)
We utilized Next.js App Router, taking advantage of React Server Components to minimize client bundle sizes. The UI is built with a custom dark-glassmorphism design system using Tailwind CSS and Framer Motion for micro-animations, giving the platform a premium, native-app feel.

---

## 🚀 Step-by-Step Demo Walkthrough

Since we don't have a video, here is how you can demo the platform yourself and see the magic in real-time.

### Step 1: The Agent Experience
1. Start the application (see Setup Instructions below).
2. Open a standard browser window and go to `http://localhost:3000`.
3. Log in with the **Agent Credentials**:
   - **Email:** `agent@lumen.com`
   - **Password:** `demo123`
4. You will land on the Agent Dashboard. Click **"Create Session"** to initialize a new secure support room.
5. Copy the generated **Join Link**.

### Step 2: The Customer Experience
1. Open an **Incognito / Private Window** (this is crucial to simulate a second user).
2. Paste the Join Link and log in with the **Customer Credentials**:
   - **Email:** `customer@lumen.com`
   - **Password:** `demo123`
3. Grant camera and microphone permissions.

### Step 3: The Magic (Put Windows Side-by-Side)
Position both browser windows side-by-side to witness the real-time capabilities:
- **Zero-Latency Video/Audio:** Watch the WebRTC feed sync instantly.
- **Live Closed Captions:** Speak into your microphone and watch the accessibility transcription overlay the customer video feed in real-time.
- **AI Agent Assist:** As you chat or speak, watch the AI on the Agent's screen automatically extract sentiment, suggest solutions, and pull data from the knowledge base without the agent having to type a single search query!

### Step 4: Admin & Analytics
1. Open a new tab and log in as the **Admin**:
   - **Email:** `admin@lumen.com`
   - **Password:** `demo123`
2. Navigate to `/admin` to view the beautiful Recharts dashboard mapping average Customer Satisfaction (CSAT) and AI ticket category distribution.

---

## ⚙️ Setup Instructions

To run Lumen locally on your machine:

### 1. Prerequisites
- Node.js v20+
- Docker and Docker Compose
- A PostgreSQL database (e.g., Supabase)
- An Upstash Redis instance (or local Redis)
- OpenAI API Key

### 2. Environment Variables
Copy the example environment file and fill in your keys:
```bash
cd frontend
cp .env.example .env.local
```
Ensure you set your `DATABASE_URL`, `OPENAI_API_KEY`, and `UPSTASH_REDIS_REST_URL`.

### 3. Start the Media Infrastructure
Start the self-hosted LiveKit Server and LiveKit Egress engine:
```bash
docker compose up -d
```
*(This spins up `livekit-server`, `livekit-egress`, and `redis` locally.)*

### 4. Database Setup & RAG Initialization
Push the Prisma schema to your PostgreSQL database, generate demo users, and seed the mock company documentation to generate vector embeddings:
```bash
cd frontend
npm install
npx prisma db push
npx prisma generate
npx tsx --env-file=.env.local scripts/seed-demo-users.ts
npx tsx --env-file=.env.local scripts/seed-kb.ts
```

### 5. Run the Application
Start the Next.js development server:
```bash
npm run dev
```
Navigate to `http://localhost:3000` to begin your demo.

---

## ⚠️ Known Limitations
- **Local Network WebRTC:** Because the Docker Compose runs locally without a STUN/TURN server or a public HTTPS reverse proxy, devices on external networks (outside your Wi-Fi) will not be able to connect to the video feed. For public hackathon demos, use Cloudflare Tunnels to expose port 3000 and 7880.
- **In-Memory RAG Limits:** The Cosine Similarity mathematical RAG is currently optimized for a small hackathon Knowledge Base (N < 1000 articles). For millions of records, migrate to `pgvector` or Pinecone.
- **LiveKit Egress CPU Usage:** Rendering composite video via GStreamer is highly CPU-intensive. On smaller laptops, triggering a recording might temporarily lag the local media server.

---
*Thank you for reviewing Lumen! Built with ❤️ for the AtomQuest Grand Finale.*
