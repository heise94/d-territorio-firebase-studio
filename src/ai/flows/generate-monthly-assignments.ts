
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
    unavailabilityPeriods: z.array(UnavailabilityPeriodAISchema).optional().describe("Periods when the house is unavailable. Do not assign this house if the assignment date falls within any of these periods.")
});

const GenerateMonthlyAssignmentsInputSchema = z.object({
  year: z.number().describe('The year for which to generate the schedule.'),
  month: z.number().describe('The month (0-indexed) for which to generate the schedule.'),
  availableDaysWithTimeSlots: AvailableDaysWithTimeSlotsAISchema
    .describe('Pre-processed available days and time slots for preaching. For each day and slot, one captain should be assigned, trying to use different ones if multiple slots on the same day.'),
  assignCasas: z.boolean().describe('Whether to assign houses to the schedule.'),
  availableCasas: z.array(CasaForAISchema).describe('Available houses for assignment, including their unavailability periods.'),
  assignTerritories: z.boolean().describe('Whether to assign territories to the schedule.'),
  availableTerritories: z
    .array(z.object({id: z.string(), name: z.string(), type: z.enum(["urban", "rural"]), number: z.string().optional() }))
    .describe('Available territories for assignment (urban/rural).'),
  detailedTerritoryReports: z
    .array(z.any())
    .describe('Detailed reports for territories. Use this to prioritize territories less worked or needing attention. If empty, this factor cannot be heavily weighted.'),
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
    .describe("Detailed information for each available publisher. IMPORTANT: If a publisher has `blockInfo.forSystem` set to 'true', you MUST NOT assign them as a captain."),
  additionalInstructions: z.string().optional().describe('Additional instructions for the system, including how to handle holiday scheduling if different from normal days.'),
  preachingGroups: z.array(PreachingGroupAISchema).describe('List of all preaching groups, their names, and their superintendent IDs (SG).'),
});

export type GenerateMonthlyAssignmentsInput = z.infer<
  typeof GenerateMonthlyAssignmentsInputSchema
>;

const ExtendedMonthlyCaptainAssignmentItemSchema = z.object({
  id: z.string().describe('UUID for this assignment'),
  date: z.string().describe('YYYY-MM-DD'),
  captainId: z.string().describe('Firebase Auth UID of the assigned captain.'),
  captainName: z.string().describe('Name of the assigned captain.'),
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
  prompt: `You are an expert in creating monthly preaching schedules for religious congregations.

  Your goal is to generate a complete schedule for the specified month, following the rules and using the data provided.

  Year: {{{year}}}
  Month: {{{month}}} (0-indexed)
  
  Available Days with Time Slots (standard schedule):
  {{#each availableDaysWithTimeSlots}}
  - {{@key}}:
    {{#each this}}
    - {{this.startTime}} ({{this.type}})
    {{/each}}
  {{else}}
  No specific time slots provided.
  {{/each}}
  
  Assign Houses: {{{assignCasas}}}
  Available Houses (IMPORTANT: Check 'unavailabilityPeriods' for each house. Do NOT assign a house if the assignment date falls within any of its unavailability periods.):
  {{#if availableCasas}}
    {{#each availableCasas}} 
    - ID: {{this.id}}, Name: {{this.name}}, Address: {{this.address}}
      {{#if this.unavailabilityPeriods}}
      Not Available:
        {{#each this.unavailabilityPeriods}}
        - From: {{this.startDate}} to {{this.endDate}} {{#if this.reason}} ({{this.reason}}) {{/if}}
        {{/each}}
      {{/if}}
    {{/each}}
  {{else}} No houses available. {{/if}}

  Assign Territories: {{{assignTerritories}}}
  Available Territories:
  {{#if availableTerritories}}
    {{#each availableTerritories}} - ID: {{this.id}}, Name: {{this.name}}, Type: {{this.type}}{{#if this.number}}, Number: {{this.number}}{{/if}}{{/each}}
  {{else}} No territories available. {{/if}}

  Detailed Territory Reports (use to prioritize less worked territories):
  {{#if detailedTerritoryReports}}
    {{#each detailedTerritoryReports}} (Details of report for territory {{this.territoryId}} - The system should infer last worked date or status) {{/each}}
  {{else}}
    No detailed territory reports provided. Prioritize rotation or other factors.
  {{/if}}
  
  Days Organized by Groups (no centralized assignments for these):
  {{#each groupPreachingDays}}
    {{#if this}} - {{@key}} is a group day. {{/if}}
  {{/each}}

  Publisher Detailed Availabilities (use this to get captainId, captainName, and check block status for assignments):
  {{#if publisherDetailedAvailabilities}}
    {{#each publisherDetailedAvailabilities}}
    - Publisher ID (for captainId): {{this.id}}, Name (for captainName): {{this.name}} {{#if this.blockInfo.forSystem}} **(BLOQUEADO PARA SISTEMA)** {{/if}}
      {{#if this.managedCasaId}} **(Gestiona Casa ID: {{this.managedCasaId}})** {{/if}}
      {{#if this.unavailabilityPeriods}}
      Not Available (Personal):
        {{#each this.unavailabilityPeriods}}
        - From: {{this.startDate}} to {{this.endDate}}
        {{/each}}
      {{/if}}
    {{/each}}
  {{else}}
    No publisher availability data provided. You MUST still attempt to assign captains based on the general logic and output a placeholder like "PENDING_CAPTAIN_ID" and "Pending Captain Name" if specific publisher IDs cannot be determined, along with a note.
  {{/if}}
  
  Holiday Dates in Month (YYYY-MM-DD format): {{{holidayDatesInMonth}}}
  Holiday Scheduling Overrides (Specific assignments for holidays):
  {{#if holidaySchedulingOverrides}}
    {{#each holidaySchedulingOverrides}}
    - On {{this.date}}, schedule a '{{this.type}}' assignment at {{this.time}}.
    {{/each}}
  {{else}}
    No special holiday assignments requested.
  {{/if}}
  
  Designated Rural Weekends:
  {{#if designatedRuralWeekendDays}}
    The following dates are designated for special rural preaching: {{{designatedRuralWeekendDays}}}. Please handle them according to any special instructions provided.
  {{else}}
    No special rural weekends have been designated.
  {{/if}}

  Additional Instructions: {{{additionalInstructions}}}

  Configured Campaigns:
  {{#if configuredCampaigns}}
    {{#each configuredCampaigns}}
    - Campaign Name: {{this.name}}
      {{#if this.specificTerritoryIds}} **Territorios Específicos:** {{{this.specificTerritoryIds}}} {{/if}}
      (Other details omitted for brevity, but available to system)
    {{/each}}
  {{else}}
    No specific campaigns configured for this month.
  {{/if}}

  Assemblies in Month (no preaching on these dates):
  {{#if assembliesInMonth}}
    {{#each assembliesInMonth}}
    - Assembly: {{this.name}} from {{this.startDate}} to {{this.endDate}}
    {{/each}}
  {{else}}
    No assemblies scheduled for this month.
  {{/if}}

  Key Considerations for Scheduling:
  1.  **Daily Iteration**: Your main task is to generate a schedule for every single day of the month specified by 'year' and 'month'.

  2.  **Working Days vs. Non-Working Days**:
      -   A day is a **Non-Working Day** if it is listed in 'holidayDatesInMonth' (UNLESS there is a specific override in 'holidaySchedulingOverrides') OR if it falls within an assembly period from 'assembliesInMonth'.
      -   For **Non-Working Days**, you MUST return an empty 'assignments' array for that date.
      -   A day is also a **Non-Working Day for centralized assignments** if 'groupPreachingDays' for that day of the week is true. Return an empty 'assignments' array for these days too.
      -   All other days are **Working Days**.

  3.  **Assignment Generation for Working Days**:
      -   For each **Working Day**, identify its day of the week (e.g., 'monday').
      -   Find the corresponding time slots for that day from 'availableDaysWithTimeSlots'.
      -   For **EACH** time slot, you must create one assignment object with a unique captain.
      -   **Captain Selection**:
          -   Select a captain from the 'publisherDetailedAvailabilities' list.
          -   **CRITICAL**: DO NOT assign a publisher if 'blockInfo.forSystem' is true.
          -   **CRITICAL**: DO NOT assign a publisher if the assignment date falls within one of their 'unavailabilityPeriods'.
          -   Try to rotate captains. Avoid assigning the same person multiple times on the same day if possible.
      -   **Casa (House) Assignment**:
          -   This applies ONLY if 'assignCasas' is true and the slot type is 'publica' or 'rural'.
          -   **PRIORITY**: If the chosen captain has a 'managedCasaId', you MUST assign their managed house. Look up the house details in 'availableCasas' using the 'managedCasaId'.
          -   If the captain has no managed house, select another available house from 'availableCasas'.
          -   **CRITICAL**: DO NOT assign a house if the assignment date falls within its 'unavailabilityPeriods'.
      -   **Territory Assignment**:
          -   This applies ONLY if 'assignTerritories' is true and the slot type is 'publica' or 'rural'.
          -   **PRIORITY**: You MUST prioritize assigning territories with the oldest 'lastWorked' date. You can find this information in the 'detailedTerritoryReports'. Rotate through available territories to ensure variety.
          -   Consider campaign requirements ('specificTerritoryIds', 'specialCampaignTerritoriesPerDay').

  4.  **Holiday Overrides**:
      -   If a date from 'holidayDatesInMonth' is present in 'holidaySchedulingOverrides', you MUST create exactly one assignment for that date as specified, following the normal captain/location assignment logic.

  5.  **Final Output Rules**:
      -   Return the schedule in the specified JSON format.
      -   Ensure every single day of the month has an entry in the 'schedule' array. For non-working days, the 'assignments' array for that date must be empty.
      -   The 'status' for all new assignments must be 'pending'.
      -   If 'preachingType' is 'zoom', then 'casaName', 'casaAddress', and 'territoryName' MUST be null or empty.
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

