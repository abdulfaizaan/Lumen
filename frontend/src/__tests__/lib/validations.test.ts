import { describe, it, expect } from 'vitest'
import { registerSchema, sessionJoinSchema, chatMessageSchema } from '@/lib/validations'

describe('Validations', () => {
  describe('registerSchema', () => {
    it('validates a correct payload without invite code (Customer)', () => {
      const payload = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'Password123'
      }
      const result = registerSchema.safeParse(payload)
      expect(result.success).toBe(true)
    })

    it('validates a correct payload with invite code (Agent)', () => {
      const payload = {
        name: 'Jane Agent',
        email: 'jane@lumen.com',
        password: 'Password123',
        inviteCode: 'SECRET-CODE'
      }
      const result = registerSchema.safeParse(payload)
      expect(result.success).toBe(true)
    })

    it('fails if password lacks uppercase', () => {
      const payload = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123'
      }
      const result = registerSchema.safeParse(payload)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('uppercase')
      }
    })

    it('fails if name is too short', () => {
      const payload = {
        name: 'J',
        email: 'john@example.com',
        password: 'Password123'
      }
      const result = registerSchema.safeParse(payload)
      expect(result.success).toBe(false)
    })
  })

  describe('sessionJoinSchema', () => {
    it('validates correct meeting ID and passcode', () => {
      const payload = {
        meetingId: '1234567890',
        passcode: 'SECRET'
      }
      const result = sessionJoinSchema.safeParse(payload)
      expect(result.success).toBe(true)
    })

    it('strips spaces from meeting ID', () => {
      const payload = {
        meetingId: '123 456 7890',
        passcode: 'SECRET'
      }
      const result = sessionJoinSchema.safeParse(payload)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.meetingId).toBe('1234567890')
      }
    })

    it('fails on invalid meeting ID length', () => {
      const payload = {
        meetingId: '12345',
        passcode: 'SECRET'
      }
      const result = sessionJoinSchema.safeParse(payload)
      expect(result.success).toBe(false)
    })
  })

  describe('chatMessageSchema', () => {
    it('validates non-empty string', () => {
      const payload = { content: 'Hello there' }
      const result = chatMessageSchema.safeParse(payload)
      expect(result.success).toBe(true)
    })

    it('fails on empty string', () => {
      const payload = { content: '   ' }
      const result = chatMessageSchema.safeParse(payload)
      expect(result.success).toBe(false)
    })
  })
})
