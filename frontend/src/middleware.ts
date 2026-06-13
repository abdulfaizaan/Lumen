import NextAuth from "next-auth"
import { authConfig } from "./auth.config"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

const { auth } = NextAuth(authConfig)

// Use Redis if env vars are present, otherwise fallback (will fail gracefully if not set)
const redis = (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) 
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    }) 
  : null

const rlTokens = redis ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, "10 s") }) : null
const rlSessions = redis ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(20, "1 m") }) : null
const rlAI = redis ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, "1 m") }) : null

export default auth(async (req) => {
  const pathname = req.nextUrl.pathname

  // --- Security Headers ---
  const headers = new Headers(req.headers)
  const response = NextResponse.next({ request: { headers } })
  
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  response.headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' wss://*.livekit.cloud https://*.livekit.cloud https://*.supabase.co;")

  // --- CSRF Protection for API Mutations ---
  if (pathname.startsWith('/api') && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    const origin = req.headers.get('origin')
    const host = req.headers.get('host')
    // Check if origin matches host (basic CSRF protection without tokens)
    if (origin && host && new URL(origin).host !== host) {
      return new NextResponse('Forbidden: Invalid Origin', { status: 403 })
    }
  }

  // --- Rate Limiting ---
  const ip = req.headers.get("x-forwarded-for") ?? "127.0.0.1"
  
  if (redis) {
    if (pathname.startsWith('/api/livekit/token')) {
      const { success } = await rlTokens!.limit(`token_${ip}`)
      if (!success) return new NextResponse('Too Many Requests', { status: 429 })
    }
    if (pathname === '/api/sessions' && req.method === 'POST') {
      const { success } = await rlSessions!.limit(`session_${ip}`)
      if (!success) return new NextResponse('Too Many Requests', { status: 429 })
    }
    if (pathname.startsWith('/api/ai')) {
      const { success } = await rlAI!.limit(`ai_${ip}`)
      if (!success) return new NextResponse('Too Many Requests', { status: 429 })
    }
  }

  // --- Auth & Routing Logic ---
  const isLoggedIn = !!req.auth
  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/register')
  const isDashboard = pathname.startsWith('/dashboard')
  const isSession = pathname.startsWith('/session')
  const isAdmin = pathname.startsWith('/admin')

  if (isAuthPage) {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL('/dashboard', req.nextUrl))
    }
    return response
  }

  if (!isLoggedIn && (isDashboard || isSession || isAdmin)) {
    return NextResponse.redirect(new URL('/login', req.nextUrl))
  }

  if (isAdmin && isLoggedIn) {
    const role = (req.auth?.user as any)?.role
    if (role !== "ADMIN") {
      return NextResponse.redirect(new URL('/dashboard', req.nextUrl))
    }
  }

  // NextAuth auth() wrapper doesn't directly return the response with headers easily if we also do redirects.
  // We apply headers to the final response.
  // However, NextAuth middleware expects either `Response` or `undefined`.
  // The modified headers are applied to `response`, we should return it for allowed routes.
  // Except NextAuth modifies request implicitly. Let's construct a new NextResponse with auth.
  
  return response
})

export const config = {
  // Apply to all routes so security headers run everywhere, 
  // but ignore static assets
  matcher: ['/((?!_next/static|_next/image|favicon.ico|uploads).*)'],
}
