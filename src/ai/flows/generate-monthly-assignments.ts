'use server';

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import type { DayOfWeek, PreachingType } from '@/types';

const PreachingGroupAISchema = z.object({
    id: z.string().describe("Unique ID of the preaching group."),
    name: z.string().describe("Name of the preaching group."),
    superintendentId: z.string().optional().describe("Firebase Auth UID of the Superintendent of this Group (SG).")
});

const AssemblyAISchema = z.object({
    name: z.string().describe("Name or type of the assembly."),
    startDate: z.string().describe("Assembly start date, YYYY-MM-DD or similar Firestore Timestamp representation"),
    endDate: z.string().describe("Assembly end date, YYYY-MM-DD or similar Firestore Timestamp representation"),
    description: z.string().optional().describe("Optional description of the assembly."),
});

const BlockInfoAISchema = z.object({
  forSystem: z.boolean().describe("True if blocked for system-wide automatic assignment."),
  forGroup: z.boolean().describe("True if blocked for manual group assignment."),
  reason: z.string().optional().describe("Reason for block.")
});

const UnavailabilityPeriodAISchema = z.object({
    startDate: z.string().describe("Start date of unavailability (YYYY-MM-DD)."),
    endDate: z.string().describe("End date of unavailability (YYYY-MM-DD)."),
    reason: z.string().optional().describe("Reason for unavailability."),
});

const PublisherDetailForAISchema = z.object({
    id: z.string().describe("Firebase Auth UID of the publisher."),
    name: z.string().describe("Full name of the publisher."),
    blockInfo: BlockInfoAISchema.optional().describe("Information about any blocks on this publisher. If blockInfo.forSystem is true, DO NOT assign them."),
    unavailabilityPeriods: z.array(UnavailabilityPeriodAISchema).optional().describe("Periods when the publisher is unavailable. Do not assign them as a captain if the assignment date falls within any of these periods."),
    managedCasaId: z.string().optional().describe("The ID of the house this publisher manages, if any. This should be prioritized for their assignments."),
}).describe("Detailed information about an available publisher, including their ID, name, block status, and unavailability periods for captain assignment.");


const TimeSlotAISchema = z.object({
  startTime: z.string().describe("Start time of the slot (HH:MM)."),
  type: z.enum(['general', 'rural', 'zoom']).describe("Type of preaching for the slot."),
});

const AvailableDaysWithTimeSlotsAISchema = z.record(
  z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']),
  z.array(TimeSlotAISchema)
).describe("Object where keys are days of the week (lowercase English) and values are arrays of time slots available for that day. Example: {'monday': [{startTime: '09:00', type: 'general'}, {startTime: '15:00', type: 'zoom'}]}");


const GroupPreachingDaysAISchema = z.record(
  z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']),
  z.boolean()
).describe("Object where keys are days of the week (lowercase English) and value is true if preaching is organized by groups on that day, false or omitted otherwise. No centralized assignments should be made for true days.");


const CasaForAISchema = z.object({
    id: z.string(),
    name: z.string(),
    address: z.string().optional(),
    associatedTerritoryIds: z.array(z.string()).optional().describe("IDs of territories located near this house."),
    unavailabilityPeriods: z.array(UnavailabilityPeriodAISchema).optional().describe("Periods when the house is unavailable. Do not assign this house if the assignment date falls within any of these periods.")
});

const GenerateMonthlyAssignmentsInputSchema = z.object({
  year: z.number().describe('The year for which to generate the schedule.'),
  month: z.number().describe('The month (0-indexed) for which to generate the schedule.'),
  availableDaysWithTimeSlots: AvailableDaysWithTimeSlotsAISchema
    .describe('Pre-processed available days and time slots for preaching. For each day and slot, one captain should be assigned, trying to use different ones if multiple slots on the same day.'),
  assignCasas: z.boolean().describe('Whether to assign houses to the schedule.'),
  assignTerritories: z.boolean().describe('Whether to assign territories to the schedule.'),
  assignCaptains: z.boolean().describe('Whether to assign captains to the schedule.'),
  availableCasas: z.array(CasaForAISchema).describe('Available houses for assignment, including their unavailability periods and nearby territories.'),
  availableTerritories: z
    .array(z.object({id: z.string(), name: z.string(), type: z.enum(["urban", "rural"]), number: z.string().optional(), lastWorked: z.string().optional(), associatedCasaIds: z.array(z.string()).optional() }))
    .describe('Available territories for assignment (urban/rural), including their last worked date and associated house IDs.'),
  groupPreachingDays: GroupPreachingDaysAISchema.describe('Days when preaching is organized by groups. No centralized assignments for these days.'),
  configuredCampaigns: z.array(z.object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
    startDate: z.string().describe("Campaign start date, YYYY-MM-DD"),
    endDate: z.string().describe("Campaign end date, YYYY-MM-DD"),
    superintendentName: z.string().optional(),
    specialCampaignTerritoriesPerDay: z.number().optional().describe("Number of specific territories for this campaign per day. If 0 or undefined, use standard logic or global default."),
    specificTerritoryIds: z.array(z.string()).optional().describe("An optional list of specific territory IDs to prioritize for this campaign."),
    description: z.string().optional(),
  })).describe('Configured campaigns for the month. The system should determine if a campaign is active based on its start/end dates relative to the current month being scheduled.'),
  specialCampaignTerritoriesPerDay: z
    .number()
    .describe('Default number of territories to assign per day for special campaigns, if not specified in the campaign object itself.'),
  holidayDatesInMonth: z.array(z.string()).describe('Holiday dates in the month (YYYY-MM-DD format). No preaching on these days unless specified in holidaySchedulingOverrides or additionalInstructions.'),
  holidaySchedulingOverrides: z.array(z.object({
      date: z.string().describe("The specific holiday date (YYYY-MM-DD) to schedule."),
      time: z.string().describe("The specific time (HH:MM) for this holiday assignment."),
      type: z.enum(['general', 'rural', 'zoom']).describe("The type of preaching for this holiday assignment.")
  })).optional().describe("A list of specific assignments for holidays, overriding the default behavior of no preaching. Use this to schedule preaching on specific holidays at specific times."),
  designatedRuralWeekendDays: z.array(z.string()).optional().describe("A list of dates (YYYY-MM-DD) for special rural weekend preaching. These dates should receive special consideration as per any additional instructions."),
  assembliesInMonth: z.array(AssemblyAISchema).optional().describe('List of assemblies (Circuit, Regional, etc.) occurring in the scheduling month. No preaching should be scheduled on these dates.'),
  publisherDetailedAvailabilities: z
    .array(PublisherDetailForAISchema)
    .describe("Detailed information for each available publisher. IMPORTANT: If a publisher has 'blockInfo.forSystem' set to 'true', you MUST NOT assign them as a captain."),
  additionalInstructions: z.string().optional().describe('Additional instructions for the system, including how to handle holiday scheduling if different from normal days.'),
  preachingGroups: z.array(PreachingGroupAISchema).describe('List of all preaching groups, their names, and their superintendent IDs (SG).'),
});

export type GenerateMonthlyAssignmentsInput = z.infer<
  typeof GenerateMonthlyAssignmentsInputSchema
>;

const ExtendedMonthlyCaptainAssignmentItemSchema = z.object({
  id: z.string().describe('UUID for this assignment'),
  date: z.string().describe('YYYY-MM-DD'),
  captainId: z.string().optional().nullable().describe('Firebase Auth UID of the assigned captain. Can be null if assignCaptains is false.'),
  captainName: z.string().optional().nullable().describe('Name of the assigned captain. Can be null if assignCaptains is false.'),
  time: z.string().describe('HH:MM'),
  status: z.string().describe("('not_sent', 'pending_confirmation', 'accepted', 'rejected') - Initially always 'pending' after generation, to be confirmed by user."),
  preachingType: z.string().describe("('publica', 'zoom', 'rural')"),
  casaName: z.string().optional().nullable().describe('Optional casa name if preachingType is related to a casa. MUST be null/empty if preachingType is "zoom".'),
  casaAddress: z.string().optional().nullable().describe('Optional casa address. MUST be null/empty if preachingType is "zoom".'),
  territoryName: z.string().optional().nullable().describe('Optional territory name if preachingType is related to a territory. MUST be null/empty if preachingType is "zoom".'),
});

const DailyAssignmentSchema = z.object({
  date: z.string().describe("The date for these assignments in YYYY-MM-DD format."),
  assignments: z.array(ExtendedMonthlyCaptainAssignmentItemSchema)
    .describe("An array of assignments for this specific date. Should be an empty array if it is a holiday or assembly day with no scheduled preaching."),
});

const GenerateMonthlyAssignmentsOutputSchema = z.object({
  schedule: z.array(DailyAssignmentSchema)
    .describe("An array of daily schedules for the entire month. Every day of the month should have an entry, even if it has no assignments."),
});


export type GenerateMonthlyAssignmentsOutput = z.infer<
  typeof GenerateMonthlyAssignmentsOutputSchema
>;

export async function generateMonthlyAssignments(
  input: GenerateMonthlyAssignmentsInput
): Promise<GenerateMonthlyAssignmentsOutput> {
  return generateMonthlyAssignmentsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateMonthlyAssignmentsPrompt',
  input: {schema: GenerateMonthlyAssignmentsInputSchema},
  output: {schema: GenerateMonthlyAssignmentsOutputSchema},
  prompt: `You are a meticulous and logical scheduler for a religious congregation. Your task is to generate a complete monthly preaching schedule.

  Your goal is to create a schedule array containing an entry for EVERY SINGLE DAY of the specified month (year: {{{year}}}, month: {{{month}}}).

  First, determine which days are NON-WORKING days. A day is non-working if it's a holiday, an assembly day, or a day designated for group-organized preaching. For these days, the 'assignments' array MUST be empty.

  For all other days (WORKING days), you must iterate through EACH time slot defined in 'availableDaysWithTimeSlots' for that day of the week. For EACH time slot, you will create exactly ONE assignment object by following these steps IN ORDER:

  **STEP 1: CHOOSE THE TERRITORY** (if 'assignTerritories' is true and the slot type is not 'zoom')
  - First, check for active campaigns. If a campaign is active and has 'specificTerritoryIds', you MUST choose one of those territories.
  - If no campaign dictates the territory, you MUST search the 'availableTerritories' list and select the one with the oldest 'lastWorked' date.
  - This is now the [CHOSEN_TERRITORY]. If no suitable territory is found, this part of the assignment will be blank.

  **STEP 2: CHOOSE THE CAPTAIN** (if 'assignCaptains' is true)
  - Filter the 'publisherDetailedAvailabilities' list to find all publishers who are available for this specific date and time slot.
  - IMPORTANT: You MUST EXCLUDE any publisher where 'blockInfo.forSystem' is true.
  - IMPORTANT: You MUST EXCLUDE any publisher if the assignment date falls within one of their 'unavailabilityPeriods'.
  - From the final list of available publishers, select one. Try to rotate captains to ensure variety.
  - This is now the [CHOSEN_CAPTAIN]. If no captain can be chosen, this part of the assignment will be blank.

  **STEP 3: CHOOSE THE CASA (MEETING PLACE)** (if 'assignCasas' is true and the slot type is not 'zoom')
  - **Priority A: Captain's Managed Casa.** If a [CHOSEN_CAPTAIN] was selected and they have a 'managedCasaId', find that casa in the 'availableCasas' list. If that casa is available (not within an unavailability period), you MUST assign it.
  - **Priority B: Territory's Associated Casa.** If Priority A is not met, check if the [CHOSEN_TERRITORY] has 'associatedCasaIds'. If it does, pick one of those casas from the 'availableCasas' list, ensuring it's available.
  - **Priority C: Any Other Available Casa.** If neither Priority A nor B is met, select any other available casa from the 'availableCasas' list. Ensure it's not unavailable. Try to rotate casas.
  - This is now the [CHOSEN_CASA].

  **STEP 4: ASSEMBLE THE ASSIGNMENT OBJECT**
  - Create the final JSON object for this time slot.
  - Use the details from the [CHOSEN_TERRITORY], [CHOSEN_CAPTAIN], and [CHOSEN_CASA].
  - Set 'status' to 'pending'.
  - If 'preachingType' is 'zoom', then 'casaName', 'casaAddress', and 'territoryName' MUST be null.

  Follow this logic meticulously for every assignment on every working day.
  `,
});

const generateMonthlyAssignmentsFlow = ai.defineFlow(
  {
    name: 'generateMonthlyAssignmentsFlow',
    inputSchema: GenerateMonthlyAssignmentsInputSchema,
    outputSchema: GenerateMonthlyAssignmentsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
