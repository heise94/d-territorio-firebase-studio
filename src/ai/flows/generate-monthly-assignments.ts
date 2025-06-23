
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

const PublisherDetailForAISchema = z.object({
    id: z.string().describe("Firebase Auth UID of the publisher."),
    name: z.string().describe("Full name of the publisher."),
}).describe("Detailed information about an available publisher, including their ID and name for captain assignment.");

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

const UnavailabilityPeriodAISchema = z.object({
    startDate: z.string().describe("Start date of unavailability (YYYY-MM-DD)."),
    endDate: z.string().describe("End date of unavailability (YYYY-MM-DD)."),
    reason: z.string().optional().describe("Reason for unavailability."),
});

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
  })).describe('Configured campaigns for the month. The AI should determine if a campaign is active based on its start/end dates relative to the current month being scheduled.'),
  specialCampaignTerritoriesPerDay: z
    .number()
    .describe('Default number of territories to assign per day for special campaigns, if not specified in the campaign object itself.'),
  holidayDatesInMonth: z.array(z.string()).describe('Holiday dates in the month (YYYY-MM-DD format). No preaching on these days unless specified in additional instructions.'),
  assembliesInMonth: z.array(AssemblyAISchema).optional().describe('List of assemblies (Circuit, Regional, etc.) occurring in the scheduling month. No preaching should be scheduled on these dates.'),
  publisherDetailedAvailabilities: z
    .array(PublisherDetailForAISchema)
    .describe('Detailed information for each available publisher, including their ID (for captainId) and name (for captainName). Crucial for assigning captains.'),
  additionalInstructions: z.string().optional().describe('Additional instructions for the AI, including how to handle holiday scheduling if different from normal days.'),
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
  ).describe('Object, key \"YYYY-MM-DD\", value array of ExtendedMonthlyCaptainAssignmentItem. For days with assemblies or holidays (unless overridden), this array should be empty.'),
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
  
  Available Days with Time Slots:
  {{#each availableDaysWithTimeSlots}}
  - {{this.dayOfWeek}}:
    {{#each this.slots}}
    - {{this.startTime}} ({{this.type}})
    {{/each}}
  {{else}}
  No specific time slots provided. Assume standard availability based on publisher details.
  {{/each}}
  (Note: For each time slot in 'availableDaysWithTimeSlots' on a given day, assign ONE captain. If a day has multiple time slots, aim to assign a DIFFERENT captain to each slot, based on their availability.)
  
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
    {{#each detailedTerritoryReports}} (Details of report for territory {{this.territoryId}} - AI should infer last worked date or status) {{/each}}
  {{else}}
    No detailed territory reports provided. Prioritize rotation or other factors.
  {{/if}}
  
  Days Organized by Groups (no centralized assignments for these):
  {{#each groupPreachingDays}}
    {{#if this.isGroupDay}} - {{this.dayOfWeek}} is a group day. {{/if}}
  {{/each}}

  Publisher Detailed Availabilities (use this to get captainId and captainName for assignments):
  {{#if publisherDetailedAvailabilities}}
    {{#each publisherDetailedAvailabilities}}
    - Publisher ID (for captainId): {{this.id}}, Name (for captainName): {{this.name}}
    {{/each}}
  {{else}}
    No publisher availability data provided. You MUST still attempt to assign captains based on the general logic and output a placeholder like "PENDING_CAPTAIN_ID" and "Pending Captain Name" if specific publisher IDs cannot be determined, along with a note.
  {{/if}}
  
  Holiday Dates in Month (YYYY-MM-DD format - no preaching unless specified in additional instructions): {{{holidayDatesInMonth}}}
  Additional Instructions: {{{additionalInstructions}}}

  Configured Campaigns:
  {{#if configuredCampaigns}}
    {{#each configuredCampaigns}}
    - Campaign Name: {{this.name}}
      Type: {{this.type}}
      Start Date: {{this.startDate}}
      End Date: {{this.endDate}}
      {{#if this.superintendentName}}Superintendent for this campaign: {{this.superintendentName}}{{/if}}
      {{#if this.specialCampaignTerritoriesPerDay}}Territories per day for this campaign: {{this.specialCampaignTerritoriesPerDay}}{{else}}Use default logic for territories per day.{{/if}}
      {{#if this.description}}Description: "{{this.description}}"{{/if}}
      (AI Note: Determine if this campaign is active for the current scheduling month based on its start/end dates)
    {{/each}}
  {{else}}
    No specific campaigns configured for this month.
  {{/if}}
  Default Special Campaign Territories Per Day (use if a campaign doesn't specify its own, or if relevant for general special days): {{{specialCampaignTerritoriesPerDay}}}

  Assemblies in Month (no preaching on these dates):
  {{#if assembliesInMonth}}
    {{#each assembliesInMonth}}
    - Assembly: {{this.name}}
      Start Date: {{this.startDate}}
      End Date: {{this.endDate}}
      {{#if this.description}}Description: "{{this.description}}"{{/if}}
    {{/each}}
  {{else}}
    No assemblies scheduled for this month.
  {{/if}}

  Key Considerations for Scheduling:
  1. General Captain Assignment:
     - For each time slot in 'availableDaysWithTimeSlots' (including 'publica', 'rural', and 'zoom' types) on a given day, assign ONE captain. Use 'publisherDetailedAvailabilities' to select a suitable publisher and set their 'id' as 'captainId' and 'name' as 'captainName'.
     - If a day has multiple time slots (e.g., morning and afternoon), aim to assign a DIFFERENT captain to each slot, based on their availability.
     - If no specific instructions are given for holidays, apply this general logic IF preaching is allowed on a holiday per 'additionalInstructions'.
     - When assigning a 'casaName' or 'casaAddress' (for 'publica' or 'rural' types ONLY), ensure the chosen house is NOT within one of its 'unavailabilityPeriods' for the assignment date. If all suitable houses are unavailable, do not assign a house.
     - IMPORTANT: If the 'preachingType' for a slot is 'zoom', then 'casaName', 'casaAddress', and 'territoryName' MUST be null or empty in the output. Zoom preaching does not use physical locations.

  2. Assembly Days & Holidays:
     - For any date that falls within the range of an assembly listed in 'assembliesInMonth', OR is listed in 'holidayDatesInMonth' (unless 'additionalInstructions' explicitly allows preaching on that holiday), NO preaching assignments should be made.
     - The 'captainAssignments' for such dates should be an empty array.

  3. Campaigns:
     - Determine active campaigns based on their start/end dates relative to the 'year' and 'month' being scheduled.
     - 'invitation' (Conmemoración/Asamblea) and 'special': Assign more territories as specified by 'specialCampaignTerritoriesPerDay' for that campaign (or the default if not set per campaign). Captain assignment for each slot follows general logic (one captain per slot, including 'captainId' and 'captainName').
     - 'superintendent_visit': On the days of this campaign, assign the specified 'specialCampaignTerritoriesPerDay' (for this campaign) to the 'superintendentName' as the captain for one of the slots. You'll need to find the 'id' of the 'superintendentName' from 'publisherDetailedAvailabilities' to set 'captainId'. Ensure other captain assignments for other slots on these days are adjusted accordingly.

  4. Group Preaching Days (that are NOT 'Assembly Days' or 'Holidays'):
     - For any day where 'groupPreachingDays' indicates it's a group-organized day, do NOT generate centralized captain assignments.

  Return the schedule in the following JSON format. Ensure 'status' is 'pending' for all new assignments. 'preachingType' should be 'publica', 'zoom', or 'rural'. For assembly days and holidays (unless overridden), the array for that date must be empty.
  For 'zoom' preachingType, ensure 'casaName', 'casaAddress', and 'territoryName' are null or empty.
  {
    "captainAssignments": {
      "YYYY-MM-DD": [ 
        // Empty array for assembly/holiday days, e.g., "2024-03-15": [] 
      ],
      "YYYY-MM-DD": [
        {
          "id": "UUID",
          "date": "YYYY-MM-DD",
          "captainId": "firebaseAuthUidForCaptain",
          "captainName": "Captain's Full Name",
          "time": "HH:MM",
          "status": "pending", // Always pending after generation
          "preachingType": "publica", // or "zoom", "rural"
          "casaName": null, // Null or empty if preachingType is "zoom"
          "casaAddress": null, // Null or empty if preachingType is "zoom"
          "territoryName": null // Null or empty if preachingType is "zoom"
        }
      ]
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
