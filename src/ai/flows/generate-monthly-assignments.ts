
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
    unavailabilityPeriods: z.array(UnavailabilityPeriodAISchema).optional().describe("Periods when the publisher is unavailable. Do not assign them as a captain if the assignment date falls within any of these periods.")
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
    .describe("Detailed information for each available publisher. IMPORTANT: If a publisher has `blockInfo.forSystem` set to true, you MUST NOT assign them as a captain."),
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

const GenerateMonthlyAssignmentsOutputSchema = z.object({
  captainAssignments: z.record(
    z.string(), // Key will be YYYY-MM-DD
    z.array(ExtendedMonthlyCaptainAssignmentItemSchema)
  ).describe('Object, key \"YYYY-MM-DD\", value array of ExtendedMonthlyCaptainAssignmentItem. For days with assemblies or un-scheduled holidays, this array should be empty.'),
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

  Given the following information, generate a monthly preaching schedule that optimizes territory coverage while considering publisher availability and other constraints.
  For each assignment, you MUST provide the 'captainId' (Firebase Auth UID of the publisher) and 'captainName' (full name of the publisher) based on the 'publisherDetailedAvailabilities' list provided.

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
    The following dates are designated for special rural preaching: {{join designatedRuralWeekendDays ", "}}. Please handle them according to any special instructions provided.
  {{else}}
    No special rural weekends have been designated.
  {{/if}}

  Additional Instructions: {{{additionalInstructions}}}

  Configured Campaigns:
  {{#if configuredCampaigns}}
    {{#each configuredCampaigns}}
    - Campaign Name: {{this.name}} (Details omitted for brevity, but available to system)
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
  1. General Captain Assignment:
     - For each day of the week, use the corresponding time slots from 'availableDaysWithTimeSlots' to create assignments.
     - For each slot, assign ONE captain. Use 'publisherDetailedAvailabilities' to select a suitable publisher and set their 'id' as 'captainId' and 'name' as 'captainName'.
     - **IMPORTANT:** Do NOT assign any publisher that has \`blockInfo.forSystem\` set to \`true\`.
     - **CRITICAL:** Do NOT assign any publisher if the assignment date falls within any of their 'unavailabilityPeriods'.
     - If a day has multiple time slots, aim to assign a DIFFERENT captain to each slot.
     - When assigning a 'casaName' or 'casaAddress' (for 'publica' or 'rural' types ONLY), ensure the chosen house is NOT within one of its 'unavailabilityPeriods' for the assignment date.
     - IMPORTANT: If the 'preachingType' for a slot is 'zoom', then 'casaName', 'casaAddress', and 'territoryName' MUST be null or empty in the output.

  2. Assembly Days & Holidays:
     - For any date that falls within the range of an assembly listed in 'assembliesInMonth', NO preaching assignments should be made. The 'captainAssignments' for such dates should be an empty array.
     - For any date listed in 'holidayDatesInMonth', NO preaching assignments should be made, UNLESS that date is also present in 'holidaySchedulingOverrides'.
     - If a holiday date is in 'holidaySchedulingOverrides', you MUST create exactly one assignment for that date using the specified time and type from the override object. The general captain assignment logic (picking a suitable publisher) still applies.

  3. Campaigns:
     - Determine active campaigns based on their start/end dates.
     - Adjust territory assignment logic for 'invitation' and 'special' campaigns as needed (e.g., more territories).
     - For 'superintendent_visit', assign the superintendent to one of the slots on the campaign days.

  4. Group Preaching Days:
     - For any day where 'groupPreachingDays' indicates it's a group-organized day (and it's not a holiday or assembly day), do NOT generate centralized captain assignments.

  5. Designated Rural Weekends:
     - For any date listed in 'designatedRuralWeekendDays', apply any relevant special logic from the 'additionalInstructions' when creating assignments for the rural slots on that day. For example, if instructed to assign an SG, attempt to do so.

  Return the schedule in the following JSON format. Ensure 'status' is 'pending' for all new assignments. For assembly days and un-scheduled holidays, the array for that date must be empty.
  {
    "captainAssignments": {
      "YYYY-MM-DD": [ /* Assignments for the day, or empty array */ ]
    }
  }`,
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
