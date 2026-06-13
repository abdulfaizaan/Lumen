import { z } from "zod";

// ─── Auth Schemas ────────────────────────────────────────────────
export const registerSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name must be at most 50 characters")
    .trim(),
  email: z
    .string()
    .email("Please enter a valid email address")
    .max(255)
    .trim()
    .toLowerCase(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be at most 128 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  inviteCode: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address").trim().toLowerCase(),
  password: z.string().min(1, "Password is required"),
});

// ─── Session Schemas ─────────────────────────────────────────────
export const sessionJoinSchema = z.object({
  meetingId: z
    .string()
    .transform((val) => val.replace(/\s+/g, ""))
    .pipe(z.string().regex(/^\d{10}$/, "Meeting ID must be 10 digits")),
  passcode: z
    .string()
    .min(1, "Passcode is required")
    .max(10)
    .transform((val) => val.toUpperCase().trim()),
});

export const noteUpdateSchema = z.object({
  notes: z.string().max(5000, "Notes must be at most 5000 characters"),
});

// ─── Chat Schemas ────────────────────────────────────────────────
export const chatMessageSchema = z.object({
  content: z
    .string()
    .min(1, "Message cannot be empty")
    .max(2000, "Message must be at most 2000 characters")
    .trim(),
});

// ─── File Schemas ────────────────────────────────────────────────
const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const fileUploadSchema = z.object({
  fileName: z.string().min(1).max(255),
  fileType: z.string().refine(
    (type) => ALLOWED_FILE_TYPES.includes(type as any),
    "File type not supported. Allowed: PDF, PNG, JPG, DOCX"
  ),
  fileSize: z.number().max(MAX_FILE_SIZE, "File size must be under 10MB"),
});

// ─── Pagination Schemas ──────────────────────────────────────────
export const paginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 20))
    .pipe(z.number().min(1).max(100)),
});

// ─── Admin Schemas ───────────────────────────────────────────────
export const adminSessionFilterSchema = z.object({
  status: z.enum(["WAITING", "ACTIVE", "ENDED", "FAILED"]).optional(),
  agentId: z.string().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  cursor: z.string().optional(),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 20))
    .pipe(z.number().min(1).max(100)),
});

// ─── Helpers ─────────────────────────────────────────────────────
export type ApiError = {
  error: string;
  details?: Record<string, string[]>;
};

export function formatZodErrors(error: z.ZodError): ApiError {
  const details: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const path = issue.path.join(".") || "_root";
    if (!details[path]) details[path] = [];
    details[path].push(issue.message);
  }
  return {
    error: "Validation failed",
    details,
  };
}
