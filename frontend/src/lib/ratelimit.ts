import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Simple in-memory fallback if Redis is not configured
class InMemoryRateLimiter {
  private requests: Map<string, number[]> = new Map();

  async limit(identifier: string) {
    const now = Date.now();
    const windowStart = now - 10000; // 10 seconds
    
    let userRequests = this.requests.get(identifier) || [];
    userRequests = userRequests.filter(timestamp => timestamp > windowStart);
    
    if (userRequests.length >= 5) {
      return { success: false };
    }
    
    userRequests.push(now);
    this.requests.set(identifier, userRequests);
    
    return { success: true };
  }
}

// Create a new ratelimiter, that allows 5 requests per 10 seconds
export const ratelimit = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(5, "10 s"),
      analytics: true,
    })
  : new InMemoryRateLimiter() as unknown as Ratelimit;
