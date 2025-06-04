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
  configuredCampaigns: z.array(z.any()).describe('Configured campaigns for the month.'),
  specialCampaignTerritoriesPerDay: z
    .number()
    .describe('Number of territories to assign per day for special campaigns.'),
  holidayDatesInMonth: z.array(z.string()).describe('Holiday dates in the month.'),
  publisherDetailedAvailabilities: z
    .array(z.any())
    .describe('Detailed availability information for each publisher.'),
  additionalInstructions: z.string().optional().describe('Additional instructions for the AI.'),
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
  Number of Captains Needed per Day: {{{numberOfCaptains}}}
  Available Days with Time Slots: {{{availableDaysWithTimeSlots}}}
  Assign Houses: {{{assignCasas}}}
  Available Houses: {{{availableCasas}}}
  Assign Territories: {{{assignTerritories}}}
  Available Territories: {{{availableTerritories}}}
  Detailed Territory Reports: {{{detailedTerritoryReports}}}
  Designated Rural Sundays: {{{designatedRuralSundays}}}
  Predetermined Rural Sunday Assignments: {{{predeterminedRuralSundayAssignments}}}
  Group Preaching Days: {{{groupPreachingDays}}}
  Configured Campaigns: {{{configuredCampaigns}}}
  Special Campaign Territories Per Day: {{{specialCampaignTerritoriesPerDay}}}
  Holiday Dates in Month: {{{holidayDatesInMonth}}}
  Publisher Detailed Availabilities: {{{publisherDetailedAvailabilities}}}
  Additional Instructions: {{{additionalInstructions}}}

  Return the schedule in the following JSON format:
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
          "territoryName": "Optional territory name"
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
