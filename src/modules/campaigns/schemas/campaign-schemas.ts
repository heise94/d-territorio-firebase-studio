import { z } from 'zod';

export const campaignStatuses = ['draft', 'registration_open', 'planning', 'published', 'active', 'completed'] as const;
const optionalText = z.string().trim().max(500).optional().transform((value) => value || undefined);
const optionalNonNegativeInt = z.preprocess(
  (value) => value === '' || value === null ? undefined : value,
  z.coerce.number().int().min(0).optional(),
);

export const campaignSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio.').max(120), description: optionalText,
  locationName: optionalText, locationDetails: optionalText, defaultCapacityPerBlock: optionalNonNegativeInt,
  maxPointsDefault: optionalNonNegativeInt, status: z.enum(campaignStatuses).default('draft'),
});
export const campaignDaySchema = z.object({ date: z.string().date('Selecciona una fecha válida.'), label: z.string().trim().max(120).optional().transform((value) => value || undefined), maxPointsOverride: optionalNonNegativeInt, active: z.boolean().default(true) });
export const timeBlockSchema = z.object({ startTime: z.string().regex(/^([01]\\d|2[0-3]):[0-5]\\d$/, 'Selecciona una hora de inicio válida.'), endTime: z.string().regex(/^([01]\\d|2[0-3]):[0-5]\\d$/, 'Selecciona una hora de término válida.'), label: z.string().trim().max(120).optional().transform((value) => value || undefined), capacityOverride: optionalNonNegativeInt, active: z.boolean().default(true) }).refine((value) => value.endTime > value.startTime, { message: 'La hora de término debe ser posterior a la de inicio.', path: ['endTime'] });
export const congregationSchema = z.object({ name: z.string().trim().min(1, 'El nombre es obligatorio.').max(120), active: z.boolean().default(true) });
export const pointSchema = z.object({ name: z.string().trim().min(1, 'El nombre es obligatorio.').max(120), description: optionalText, locationText: optionalText, active: z.boolean().default(true) });
export type CampaignInput = z.infer<typeof campaignSchema>; export type CampaignDayInput = z.infer<typeof campaignDaySchema>; export type TimeBlockInput = z.infer<typeof timeBlockSchema>; export type CongregationInput = z.infer<typeof congregationSchema>; export type PointInput = z.infer<typeof pointSchema>;
