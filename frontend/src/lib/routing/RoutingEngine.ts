import { prisma } from '../prisma';
import { eventBus } from '../events/EventBus';

export interface RoutingStrategy {
  assign(requestId: string): Promise<string | null>; // Returns assigned agentId or null
}

export class RoundRobinStrategy implements RoutingStrategy {
  private lastAssignedAgentIndex: number = 0;

  async assign(requestId: string): Promise<string | null> {
    // 1. Get online, available agents (not busy)
    const availableAgents = await prisma.user.findMany({
      where: {
        role: 'AGENT',
        agentStatus: 'ONLINE',
      },
      orderBy: { id: 'asc' }, // Consistent ordering
    });

    if (availableAgents.length === 0) {
      return null;
    }

    // 2. Round-Robin selection
    const index = this.lastAssignedAgentIndex % availableAgents.length;
    const selectedAgent = availableAgents[index];
    this.lastAssignedAgentIndex = index + 1;

    // 3. Assign the request
    await prisma.$transaction(async (tx) => {
      // Mark request as assigned
      const request = await tx.supportRequest.update({
        where: { id: requestId },
        data: {
          status: 'ASSIGNED',
          assignedToId: selectedAgent.id,
        },
      });

      // Mark agent as busy
      await tx.user.update({
        where: { id: selectedAgent.id },
        data: { agentStatus: 'BUSY' },
      });

      // Emit event
      eventBus.publish('CUSTOMER_ASSIGNED', {
        requestId,
        agentId: selectedAgent.id,
        customerName: request.customerName,
      });
    });

    return selectedAgent.id;
  }
}

class RoutingEngine {
  private strategy: RoutingStrategy;

  constructor(strategy: RoutingStrategy) {
    this.strategy = strategy;
  }

  setStrategy(strategy: RoutingStrategy) {
    this.strategy = strategy;
  }

  async processQueue() {
    // Get oldest waiting request
    const oldestRequest = await prisma.supportRequest.findFirst({
      where: { status: 'WAITING' },
      orderBy: { createdAt: 'asc' },
    });

    if (!oldestRequest) return;

    await this.strategy.assign(oldestRequest.id);
  }
}

export const routingEngine = new RoutingEngine(new RoundRobinStrategy());

// Listen for agent status changes to trigger queue processing
eventBus.subscribe('AGENT_ONLINE', () => routingEngine.processQueue());
eventBus.subscribe('CUSTOMER_WAITING', () => routingEngine.processQueue());
