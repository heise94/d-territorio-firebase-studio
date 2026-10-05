import { z } from "zod";
import { campaignDocumentIdSchema as id } from "./registration-schemas";
export const createChangeSchema = z
  .object({
    turnId: z.string().min(1).max(1024),
    reasonCode: z.enum(["cannot_attend", "schedule_conflict", "other"]),
    comment: z.string().trim().max(500).default(""),
  })
  .strict();
export const decideChangeSchema = z
  .object({ organizerResponse: z.string().trim().max(500).default("") })
  .strict();
export const resolveChangeSchema = z
  .object({
    expectedProgramVersion: z.number().int().positive(),
    currentProgramVersionId: z.string().regex(/^[A-Za-z0-9_-]{1,256}$/),
    expectedRevision: z.string().regex(/^[a-f0-9]{64}$/),
    replacementRegistrationId: id.optional(),
    releaseWithoutReplacement: z.boolean().default(false),
    confirmWarnings: z.boolean().default(false),
    confirmUnit: z.boolean().default(false),
    confirmStale: z.boolean().default(false),
    maxTurnsOverrides: z.array(id).max(2).default([]),
    organizerResponse: z.string().trim().max(500).default(""),
  })
  .strict();
