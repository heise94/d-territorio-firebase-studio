
// use server';
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
import type { PublisherDetail } from '@/types'; // Para referencia, pero no se usa directamente en el schema si pasamos z.any()

const PreachingGroupAISchema = z.object({
    id: z.string().describe("Unique ID of the preaching group."),
    name: z.string().describe("Name of the preaching group."),
    superintendentId: z.string().optional().describe("Firebase Auth UID of the Superintendent of this Group (SG). This user will be assigned as captain for this group's rural weekend preaching.")
});

const AssemblyAISchema = z.object({
    name: z.string().describe("Name or type of the assembly."),
    startDate: z.string().describe("Assembly start date, YYYY-MM-DD or similar Firestore Timestamp representation"),
    endDate: z.string().describe("Assembly end date, YYYY-MM-DD or similar Firestore Timestamp representation"),
    description: z.string().optional().describe("Optional description of the assembly."),
});

// Define un schema más específico para PublisherDetail si es posible, o usa z.any() si la estructura varía mucho.
// Por ahora, para el prompt, es más importante describir los campos que la IA debe usar.
const PublisherDetailForAISchema = z.object({
    id: z.string().describe("Firebase Auth UID of the publisher."),
    name: z.string().describe("Full name of the publisher."),
    // Otros campos relevantes de PublisherDetail pueden ser añadidos aquí si la IA los necesita.
    // email: z.string().optional(),
    // availability: z.any().optional(), // Podría ser más específico si la IA necesita interpretar la disponibilidad
}).describe("Detailed information about an available publisher, including their ID and name.");


const GenerateMonthlyAssignmentsInputSchema = z.object({
  year: z.number().describe('The year for which to generate the schedule.'),
  month: z.number().describe('The month (0-indexed) for which to generate the schedule.'),
  availableDaysWithTimeSlots: z
    .any()
    .describe('Available days and time slots for preaching. For each day and slot, one captain should be assigned, trying to use different ones if multiple slots on the same day.'),
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
    .describe('Designated weekend days (Saturdays or Sundays) for special rural preaching (YYYY-MM-DD). These days should have a rural slot configured in availableDaysWithTimeSlots.'),
  predeterminedRuralSundayAssignments: z 
    .array(z.any())
    .describe('Predefined assignments for rural weekend days (overrides standard rural rotation for these specific dates).'),
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
  assembliesInMonth: z.array(AssemblyAISchema).optional().describe('List of assemblies (Circuit, Regional, etc.) occurring in the scheduling month. No preaching should be scheduled on these dates.'),
  publisherDetailedAvailabilities: z
    .array(PublisherDetailForAISchema) // Usamos el schema específico aquí
    .describe('Detailed availability information for each publisher, including their ID (for captainId) and name (for captainName).'),
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
  captainId: z.string().describe('Firebase Auth UID of the assigned captain.'),
  captainName: z.string().describe('Name of the assigned captain.'),
  time: z.string().describe('HH:MM'),
  status: z.string().describe("('not_sent', 'pending_confirmation', 'accepted', 'rejected') - Initially always 'pending' after generation, to be confirmed by user."),
  preachingType: z.string().describe("('publica', 'zoom', 'rural')"),
  casaName: z.string().optional().describe('Optional casa name if preachingType is related to a casa'),
  casaAddress: z.string().optional().describe('Optional casa address'),
  territoryName: z.string().optional().describe('Optional territory name if preachingType is related to a territory'),
  assignedGroupId: z.string().optional().describe('If this assignment is for a specific group (e.g. rural weekend), include the group ID here.')
});

const GenerateMonthlyAssignmentsOutputSchema = z.object({
  captainAssignments: z.record(
    z.array(ExtendedMonthlyCaptainAssignmentItemSchema)
  ).describe('Object, key \"YYYY-MM-DD\", value array of ExtendedMonthlyCaptainAssignmentItem. For days with assemblies, this array should be empty.'),
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
  Month: {{{month}}}
  Available Days with Time Slots: {{{availableDaysWithTimeSlots}}} (For each day and each slot within that day, you should assign ONE captain. If a day has multiple slots, try to assign different captains to each slot if publisher availability permits.)
  Assign Houses: {{{assignCasas}}}
  Available Houses: {{{availableCasas}}}
  Assign Territories: {{{assignTerritories}}}
  Available Territories: {{{availableTerritories}}}
  Detailed Territory Reports: {{{detailedTerritoryReports}}}
  Designated Rural Weekend Days: {{{designatedRuralSundays}}} (These are specific Saturdays or Sundays designated for rural preaching. Ensure these days have a 'rural' type slot in 'availableDaysWithTimeSlots' for the assignment to be valid. If a day is listed here but has no corresponding rural slot, ignore it for special rural assignment purposes.)
  Predetermined Rural Weekend Assignments: {{{predeterminedRuralSundayAssignments}}} (If an assignment is predetermined for one of the 'Designated Rural Weekend Days', it takes precedence.)
  Group Preaching Days (days where groups organize themselves): {{{groupPreachingDays}}}
  
  Publisher Detailed Availabilities (use this to get captainId and captainName for assignments):
  {{#if publisherDetailedAvailabilities}}
    {{#each publisherDetailedAvailabilities}}
    - Publisher ID (for captainId): {{this.id}}, Name (for captainName): {{this.name}}
    {{/each}}
  {{else}}
    No publisher availability data provided. You must still attempt to assign captains based on the general logic and output a placeholder or note if specific publisher IDs cannot be determined.
  {{/if}}
  
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

  Assemblies in Month:
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

  Rural Preaching Rotation for Weekends:
  Last Rural Weekend Leading Group ID: {{{lastRuralWeekendLeadingGroupId}}}
  All Preaching Groups (with Superintendent IDs): {{{preachingGroups}}}

  Key Considerations for Scheduling:
  1. General Captain Assignment:
     - For each time slot in 'availableDaysWithTimeSlots' on a given day, assign ONE captain. Use 'publisherDetailedAvailabilities' to select a suitable publisher and set their 'id' as 'captainId' and 'name' as 'captainName'.
     - If a day has multiple time slots (e.g., morning and afternoon), aim to assign a DIFFERENT captain to each slot, based on their availability.
     - If no specific instructions are given for holidays, apply this general logic.

  2. Assembly Days:
     - For any date that falls within the range of an assembly listed in 'assembliesInMonth', NO preaching assignments should be made.
     - The 'captainAssignments' for such dates should be an empty array.

  3. Campaigns:
     - Determine active campaigns based on their start/end dates relative to the 'year' and 'month' being scheduled.
     - 'invitation' (Conmemoración/Asamblea) and 'special': Assign more territories as specified by 'specialCampaignTerritoriesPerDay' for that campaign (or the default if not set per campaign). Captain assignment for each slot follows general logic (one captain per slot, including 'captainId' and 'captainName').
     - 'superintendent_visit': On the days of this campaign, assign the specified 'specialCampaignTerritoriesPerDay' (for this campaign) to the 'superintendentName' as the captain for one of the slots. You'll need to find the 'id' of the 'superintendentName' from 'publisherDetailedAvailabilities' to set 'captainId'. Ensure other captain assignments for other slots on these days are adjusted accordingly.

  4. Rural Preaching on Designated Weekend Days (from 'Designated Rural Weekend Days' list):
     - For RURAL preaching slots on days listed in 'Designated Rural Weekend Days' (that are NOT 'Group Preaching Days', 'Holiday Dates', or 'Assembly Days', and are available in 'availableDaysWithTimeSlots' with type 'rural'):
       a. Determine the preaching group that should lead. Use the 'preachingGroups' list and 'lastRuralWeekendLeadingGroupId' for rotation. If 'lastRuralWeekendLeadingGroupId' is not set or not found, start with the first group in 'preachingGroups'. The rotation is sequential.
       b. The CAPTAIN for this specific rural weekend assignment MUST be the 'superintendentId' of the selected group. This 'superintendentId' is the 'captainId'. Find the corresponding 'name' from 'publisherDetailedAvailabilities' to set 'captainName'.
       c. If the selected group does not have a 'superintendentId', or if the 'superintendentId' is not found in 'publisherDetailedAvailabilities', skip that group in the rotation and move to the next one that does. If no groups with SGs are available, log this as an issue or refer to 'additionalInstructions'.
       d. Only ONE captain (the SG) should be assigned for this rural weekend slot (per group, per designated day). Other slots (e.g. Publica, Zoom) on the same day follow general captain assignment logic.
       e. Include the 'assignedGroupId' in the output for this assignment.
     - Note: If 'predeterminedRuralWeekendAssignments' are provided for specific dates from 'Designated Rural Weekend Days', these take precedence over the rotation logic for those dates.

  5. Rural Preaching on Other Weekdays/Weekends (not in 'Designated Rural Weekend Days' list):
     - If 'availableDaysWithTimeSlots' includes rural slots for weekdays or non-designated weekends, assignment of captains follows the general logic (one captain per slot, selected from available publishers, setting 'captainId' and 'captainName').

  6. Holidays (that are NOT 'Assembly Days'):
     - For dates listed in 'holidayDatesInMonth', scheduling might need adjustment. Refer to 'Additional Instructions'. If no specific instructions, apply standard logic.

  7. Group Preaching Days (that are NOT 'Assembly Days'):
     - For any day listed in 'groupPreachingDays', do NOT generate centralized captain assignments.

  Return the schedule in the following JSON format. Ensure 'status' is 'pending' for all new assignments. 'preachingType' should be 'publica', 'zoom', or 'rural'. For assembly days, the array for that date must be empty.
  {
    "captainAssignments": {
      "YYYY-MM-DD": [ 
        // Empty array for assembly days, e.g., "2024-03-15": [] 
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

    

