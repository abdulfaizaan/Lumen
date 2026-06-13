import { Server as NetServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import { eventBus } from '../events/EventBus';
import { prisma } from '../prisma';

let io: SocketIOServer;

export function initSocket(server: NetServer) {
  if (io) return io;

  io = new SocketIOServer(server, {
    path: '/ws',
    destroyUpgrade: false, // Prevents breaking Next.js HMR
    cors: {
      origin: '*', // Adjust for prod
      methods: ['GET', 'POST']
    }
  });

  // Setup Redis Adapter for multi-node scaling if ENV is present
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    // For socket.io-redis-adapter we need actual redis:// urls ideally, but we will mock it 
    // or just use memory adapter if true redis connection string isn't available.
    // Assuming user might provide REDIS_URL for ioredis
    if (process.env.REDIS_URL) {
      const pubClient = new Redis(process.env.REDIS_URL);
      const subClient = pubClient.duplicate();
      io.adapter(createAdapter(pubClient, subClient));
    }
  }

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Agents join a specific room to receive dashboard and queue updates
    socket.on('join_agent_room', (agentId) => {
      socket.join('agents');
      socket.join(`agent_${agentId}`);
      
      // Update presence
      prisma.user.update({
        where: { id: agentId },
        data: { agentStatus: 'ONLINE' }
      }).then(() => {
        eventBus.publish('AGENT_ONLINE', { agentId });
      }).catch(console.error);

      socket.on('disconnect', () => {
        prisma.user.update({
          where: { id: agentId },
          data: { agentStatus: 'OFFLINE' }
        }).then(() => {
          eventBus.publish('AGENT_OFFLINE', { agentId });
        }).catch(console.error);
      });
    });

    // Customers join their session room
    socket.on('join_session_room', (sessionId) => {
      socket.join(`session_${sessionId}`);
    });
  });

  // Map EventBus to WebSockets
  eventBus.subscribe('SESSION_CREATED', (data) => io.to('agents').emit('SESSION_CREATED', data));
  eventBus.subscribe('SESSION_ENDED', (data) => io.to('agents').emit('SESSION_ENDED', data));
  eventBus.subscribe('CUSTOMER_WAITING', (data) => io.to('agents').emit('CUSTOMER_WAITING', data));
  eventBus.subscribe('CUSTOMER_ASSIGNED', (data) => io.to('agents').emit('CUSTOMER_ASSIGNED', data));
  eventBus.subscribe('AGENT_ONLINE', (data) => io.to('agents').emit('AGENT_ONLINE', data));
  eventBus.subscribe('AGENT_OFFLINE', (data) => io.to('agents').emit('AGENT_OFFLINE', data));

  return io;
}

export function getIO() {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
}
