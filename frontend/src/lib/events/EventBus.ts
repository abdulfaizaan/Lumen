import { EventEmitter } from 'events';

// In a multi-node production setup, this would be backed by Redis Pub/Sub.
// For the custom Node server, a shared EventEmitter handles single-instance events.
// BullMQ handles heavy async jobs. Socket.IO adapter handles cross-node WS.

export type LumenEvent = 
  | 'SESSION_CREATED'
  | 'SESSION_STARTED'
  | 'SESSION_ENDED'
  | 'SESSION_TRANSFERRED'
  | 'MESSAGE_SENT'
  | 'AGENT_ONLINE'
  | 'AGENT_OFFLINE'
  | 'CUSTOMER_WAITING'
  | 'CUSTOMER_ASSIGNED'
  | 'RECORDING_STARTED'
  | 'RECORDING_FINISHED'
  | 'TRANSCRIPT_RECEIVED'
  | 'AI_SENTIMENT_UPDATE'
  | 'AI_AGENT_ASSIST';

class LumenEventBus extends EventEmitter {
  private static instance: LumenEventBus;

  private constructor() {
    super();
    this.setMaxListeners(50);
  }

  public static getInstance(): LumenEventBus {
    if (!LumenEventBus.instance) {
      LumenEventBus.instance = new LumenEventBus();
    }
    return LumenEventBus.instance;
  }

  publish(event: LumenEvent, payload: any) {
    this.emit(event, payload);
  }

  subscribe(event: LumenEvent, callback: (payload: any) => void) {
    this.on(event, callback);
    // Return unsubscribe function
    return () => this.off(event, callback);
  }
}

export const eventBus = LumenEventBus.getInstance();
