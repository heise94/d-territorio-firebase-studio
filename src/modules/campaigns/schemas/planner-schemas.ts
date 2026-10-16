import { z } from "zod";
import { campaignDocumentIdSchema as id } from "./registration-schemas";
const slot = z.union([z.literal(1), z.literal(2)]);
const overrides = z
  .array(
    z
      .object({
        registrationId: id,
        availability: z.boolean().default(false),
        maxTurns: z.boolean().default(false),
      })
      .strict(),
  )
  .max(2)
  .default([])
  .refine(
    (items) =>
      new Set(items.map((item) => item.registrationId)).size === items.length,
    "Excepciones duplicadas.",
  );
export const blockPointInputSchema = z
  .object({ timeBlockId: id, pointId: id, active: z.boolean() })
  .strict();
export const assignmentInputSchema = z
  .object({
    timeBlockId: id,
    pointId: id,
    registrationId: id,
    slotNumber: slot,
    overrides,
  })
  .strict();
export const assignmentChangeSchema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("cancel"),
      expectedVersion: z.number().int().positive(),
    })
    .strict(),
  z
    .object({
      action: z.literal("move"),
      expectedVersion: z.number().int().positive(),
      pointId: id,
      slotNumber: slot,
      overrides,
    })
    .strict(),
]);
export const plannerStatusSchema = z
  .object({ status: z.enum(["registration_open", "planning"]) })
  .strict();
export type PlannerOverrides = z.infer<
  typeof assignmentInputSchema
>["overrides"];
