
// use server'
'use server';
/**
 * @fileOverview AI-powered monthly preaching schedule generation flow.
 *
 * - generateMonthlyAssignments - A function that generates monthly preaching schedules.
 * - GenerateMonthlyAssignmentsInput - The input type for the generateMonthlyAssignments function.
 * - GenerateMonthlyAssignmentsOutput - The return type for the generateMonthlyAssignments function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const PreachingGroupAISchema = z.object({
    id: z.string().describe("Unique ID of the preaching group."),
    name: z.string().describe("Name of the preaching group."),
    superintendentId: z.string().optional().describe("Firebase Auth UID of the Superintendent of this Group (SG). This user will be assigned as captain for this group's rural weekend preaching.")
});

const GenerateMonthlyAssignmentsInputSchema = z.object({
  year: z.number().describe('The year for which to generate the schedule.'),
  month: z.number().describe('The month (0-indexed) for which to generate the schedule.'),
  numberOfCaptains: z.number().describe('The number of captains to assign for regular days.'),
  availableDaysWithTimeSlots: z
    .any()
    .describe('Available days and time slots for preaching.'),
  assignCasas: z.boolean().describe('Whether to assign houses to the schedule.'),
  availableCasas: z.array(z.any()).describe('Available houses for assignment.'),
  assignTerritories: z.boolean().describe('Whether to assign territories to the schedule.'),
  availableTerritories: z
    .array(z.any())
    .describe('Available territories for assignment.'),
  detailedTerritoryReports: z
    .array(z.any())
    .describe('Detailed reports for territories.'),
  designatedRuralSundays: z
    .array(z.string())
    .describe('Designated Sundays for rural preaching (YYYY-MM-DD).'),
  predeterminedRuralSundayAssignments: z
    .array(z.any())
    .describe('Predefined assignments for rural Sundays.'),
  groupPreachingDays: z.any().describe('Days when preaching is organized by groups.'),
  configuredCampaigns: z.array(z.object({ 
    id: z.string(),
    name: z.string(),
    type: z.string(), 
    startDate: z.string().describe("Campaign start date, YYYY-MM-DD or similar Firestore Timestamp representation"),
    endDate: z.string().describe("Campaign end date, YYYY-MM-DD or similar Firestore Timestamp representation"),
    superintendentName: z.string().optional(),
    specialCampaignTerritoriesPerDay: z.number().optional().describe("Number of specific territories for this campaign per day. If 0 or undefined, use standard logic or global default."),
    description: z.string().optional(),
  })).describe('Configured campaigns for the month. Each campaign can have its own specialCampaignTerritoriesPerDay. The AI should determine if a campaign is active based on its start/end dates relative to the current month being scheduled.'),
  specialCampaignTerritoriesPerDay: z 
    .number()
    .describe('Default number of territories to assign per day for special campaigns, if not specified in the campaign object itself.'),
  holidayDatesInMonth: z.array(z.string()).describe('Holiday dates in the month (YYYY-MM-DD format). The AI should consider these for potentially different scheduling patterns, guided by additional instructions.'),
  publisherDetailedAvailabilities: z
    .array(z.any())
    .describe('Detailed availability information for each publisher.'),
  additionalInstructions: z.string().optional().describe('Additional instructions for the AI, including how to handle holiday scheduling if different from normal days, or specific requests for rural weekend assignments if the standard rotation needs to be overridden.'),
  lastRuralWeekendLeadingGroupId: z.string().optional().describe('ID of the last preaching group that led weekend rural preaching. Helps determine the next group in rotation.'),
  preachingGroups: z.array(PreachingGroupAISchema).describe('List of all preaching groups, their names, and their superintendent IDs (SG). This is crucial for rural weekend rotation and assigning the SG as captain.'),
});

export type GenerateMonthlyAssignmentsInput = z.infer<
  typeof GenerateMonthlyAssignmentsInputSchema
>;

const ExtendedMonthlyCaptainAssignmentItemSchema = z.object({
  id: z.string().describe('UUID for this assignment'),
  date: z.string().describe('YYYY-MM-DD'),
  captain: z.string().describe('Publicador name'),
  time: z.string().describe('HH:MM'),
  status: z.string().describe("('not_sent', 'pending_confirmation', 'accepted', 'rejected')"),
  preachingType: z.string().describe("('publica', 'zoom', 'rural')"),
  casaName: z.string().optional().describe('Optional casa name'),
  casaAddress: z.string().optional().describe('Optional casa address'),
  territoryName: z.string().optional().describe('Optional territory name'),
  assignedGroupId: z.string().optional().describe('If this assignment is for a specific group (e.g. rural weekend), include the group ID here.')
});

const GenerateMonthlyAssignmentsOutputSchema = z.object({
  captainAssignments: z.record(
    z.array(ExtendedMonthlyCaptainAssignmentItemSchema)
  ).describe('Object, key \"YYYY-MM-DD\", value array of ExtendedMonthlyCaptainAssignmentItem'),
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

  Year: {{{year}}}
  Month: {{{month}}}
  Number of Captains Needed per Regular Day: {{{numberOfCaptains}}}
  Available Days with Time Slots: {{{availableDaysWithTimeSlots}}}
  Assign Houses: {{{assignCasas}}}
  Available Houses: {{{availableCasas}}}
  Assign Territories: {{{assignTerritories}}}
  Available Territories: {{{availableTerritories}}}
  Detailed Territory Reports: {{{detailedTerritoryReports}}}
  Designated Rural Sundays: {{{designatedRuralSundays}}} (Note: Rural preaching may also occur on Saturdays or other days based on availability and local needs)
  Predetermined Rural Sunday Assignments: {{{predeterminedRuralSundayAssignments}}}
  Group Preaching Days (days where groups organize themselves): {{{groupPreachingDays}}}
  Publisher Detailed Availabilities: {{{publisherDetailedAvailabilities}}}
  Holiday Dates in Month: {{{holidayDatesInMonth}}}
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

  Rural Preaching Rotation for Weekends:
  Last Rural Weekend Leading Group ID: {{{lastRuralWeekendLeadingGroupId}}}
  All Preaching Groups (with Superintendent IDs): {{{preachingGroups}}}

  Key Considerations for Scheduling:
  1. Campaigns:
     - Determine active campaigns based on their start/end dates relative to the 'year' and 'month' being scheduled.
     - 'invitation' (Conmemoración/Asamblea) and 'special': Assign more territories as specified by 'specialCampaignTerritoriesPerDay' for that campaign (or the default if not set per campaign). Captain assignment follows normal logic.
     - 'superintendent_visit': On the days of this campaign, assign the specified 'specialCampaignTerritoriesPerDay' (for this campaign) to the 'superintendentName' as the captain. If 'specialCampaignTerritoriesPerDay' is not set for this campaign, use the default. Ensure other captain assignments are adjusted accordingly on these days.

  2. Rural Preaching on Weekends (Saturdays/Sundays that are NOT 'Group Preaching Days' and are available in 'availableDaysWithTimeSlots'):
     - For RURAL preaching slots on Saturdays or Sundays (including 'designatedRuralSundays' if they fall on a weekend and are available):
       a. Determine the preaching group that should lead. Use the 'preachingGroups' list and 'lastRuralWeekendLeadingGroupId' for rotation. If 'lastRuralWeekendLeadingGroupId' is not set or not found, start with the first group in 'preachingGroups'. The rotation is sequential.
       b. The CAPTAIN for this specific rural weekend assignment MUST be the 'superintendentId' of the selected group.
       c. If the selected group does not have a 'superintendentId', skip that group in the rotation and move to the next one that does. If no groups with SGs are available, log this as an issue or refer to 'additionalInstructions'.
       d. Only ONE captain (the SG) should be assigned for this rural weekend slot, regardless of 'numberOfCaptains'.
       e. Include the 'assignedGroupId' in the output for this assignment.
     - Note: If 'predeterminedRuralSundayAssignments' are provided for specific dates, these take precedence over the rotation logic for those dates.

  3. Rural Preaching on Weekdays (Monday-Friday):
     - Assignment of captains follows the general logic and 'numberOfCaptains' setting.

  4. Holidays:
     - For dates listed in 'holidayDatesInMonth', scheduling might need adjustment (e.g., different hours, more/less activity). Refer to 'Additional Instructions' for specific guidance. If no specific instructions, apply standard logic but be mindful they are special days.

  5. Group Preaching Days:
     - For any day listed in 'groupPreachingDays', do NOT generate centralized captain assignments. These days are self-organized by the groups.

  Return the schedule in the following JSON format. Ensure 'status' is 'not_sent' for all new assignments. 'preachingType' should be 'publica', 'zoom', or 'rural'.
  {
    "captainAssignments": {
      "YYYY-MM-DD": [
        {
          "id": "UUID",
          "date": "YYYY-MM-DD",
          "captain": "Publicador name",
          "time": "HH:MM",
          "status": "not_sent",
          "preachingType": "publica", 
          "casaName": "Optional casa name",
          "casaAddress": "Optional casa address",
          "territoryName": "Optional territory name",
          "assignedGroupId": "Optional group ID for rural weekend assignments"
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

