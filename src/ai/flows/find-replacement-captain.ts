
'use server';
/**
 * @fileOverview AI-powered flow to find a replacement captain for a preaching assignment.
 *
 * - findReplacementCaptain - A function that attempts to find a suitable replacement captain.
 * - FindReplacementCaptainInput - The input type for the findReplacementCaptain function.
 * - FindReplacementCaptainOutput - The return type for the findReplacementCaptain function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { Assignment, PublisherDetail, ProgramScheduleSlot } from '@/types'; // Assuming PublisherDetail is defined

// Define Zod schema for the input, mirroring parts of Assignment and adding context
const AssignmentDetailsSchema = z.object({
  date: z.string().describe('Date of the assignment (YYYY-MM-DD).'),
  time: z.string().describe('Time of the assignment (HH:MM).'),
  type: z.enum(['publica', 'rural', 'zoom']).describe('Type of preaching assignment.'),
  locationName: z.string().describe('Name of the territory or casa for the assignment.'),
});

const FindReplacementCaptainInputSchema = z.object({
  originalAssignment: AssignmentDetailsSchema.describe('Details of the assignment needing a replacement.'),
  originalCaptainId: z.string().describe('The ID of the captain who cannot fulfill the assignment.'),
  availablePublishers: z.array(z.any()) // Using z.any() for now, ideally replace with a Zod schema for PublisherDetail
    .describe('List of all available publishers with their details and availability (slot IDs, etc.).'),
  programScheduleSlots: z.array(z.any()) // Using z.any() for now, ideally replace with Zod schema for ProgramScheduleSlot
    .describe('List of all program schedule slots (day, time, type).'),
  additionalInstructions: z.string().optional().describe('Any additional instructions or context for finding a replacement.'),
});
export type FindReplacementCaptainInput = z.infer<typeof FindReplacementCaptainInputSchema>;

const FindReplacementCaptainOutputSchema = z.object({
  newCaptainId: z.string().nullable().describe('The ID of the suggested new captain, or null if no suitable replacement is found.'),
  newCaptainName: z.string().nullable().describe('The name of the suggested new captain, or null.'),
  newCaptainEmail: z.string().nullable().describe('The email of the suggested new captain, or null.'),
  reasoning: z.string().optional().describe('Brief reasoning if needed, or why no replacement was found.'),
});
export type FindReplacementCaptainOutput = z.infer<typeof FindReplacementCaptainOutputSchema>;

export async function findReplacementCaptain(
  input: FindReplacementCaptainInput
): Promise<FindReplacementCaptainOutput> {
  return findReplacementCaptainFlow(input);
}

const prompt = ai.definePrompt({
  name: 'findReplacementCaptainPrompt',
  input: {schema: FindReplacementCaptainInputSchema},
  output: {schema: FindReplacementCaptainOutputSchema},
  prompt: `You are an AI assistant responsible for finding replacement captains for preaching assignments when the original captain is unavailable.

  An assignment needs a replacement:
  - Date: {{{originalAssignment.date}}}
  - Time: {{{originalAssignment.time}}}
  - Type: {{{originalAssignment.type}}}
  - Location: {{{originalAssignment.locationName}}}
  - Original Captain ID (exclude this person): {{{originalCaptainId}}}

  You have the following list of available publishers and their general availability:
  {{#if availablePublishers}}
    {{#each availablePublishers}}
    - Publisher ID: {{this.id}}, Name: {{this.name}}, Email: {{this.email}}
      Availability (Slot IDs): {{#if this.availability.availableSlotIds}} {{join this.availability.availableSlotIds ", "}} {{else}} Not specified {{/if}}
    {{/each}}
  {{else}}
    No publisher availability data provided.
  {{/if}}

  You also have the list of all program schedule slots:
  {{#if programScheduleSlots}}
    {{#each programScheduleSlots}}
    - Slot ID: {{this.id}}, Day: {{this.dayOfWeek}}, Time: {{this.startTime}}, Type: {{this.type}}
    {{/each}}
  {{else}}
    No program schedule slot data provided.
  {{/if}}

  Additional Instructions: {{{additionalInstructions}}}

  Your task is to:
  1. Identify the specific program slot ID that matches the original assignment's date, time, and type by cross-referencing with 'programScheduleSlots' and the assignment's day of the week (you'll need to derive the day of the week from the date).
  2. Filter the 'availablePublishers' list to find individuals who:
     a. Are NOT the 'originalCaptainId'.
     b. Have marked themselves available for the identified program slot ID.
  3. From the filtered list, select ONE suitable replacement. Prioritize those with fewer recent assignments if that data were available (it's not, so select one randomly or the first suitable).
  4. If a suitable replacement is found, return their ID, name, and email.
  5. If no suitable replacement is found (e.g., no one is available for that specific slot, or no publisher/slot data provided), return null for newCaptainId, newCaptainName, and newCaptainEmail, and optionally provide a reason in 'reasoning'.

  Return the result in the specified JSON format.
  `,
});

const findReplacementCaptainFlow = ai.defineFlow(
  {
    name: 'findReplacementCaptainFlow',
    inputSchema: FindReplacementCaptainInputSchema,
    outputSchema: FindReplacementCaptainOutputSchema,
  },
  async (input: FindReplacementCaptainInput): Promise<FindReplacementCaptainOutput> => {
    // In a real scenario, you might pre-process input here, e.g., fetch more detailed availability
    // or convert date to dayOfWeek if not directly available.
    // For now, the prompt handles deriving day of week.

    if (!input.availablePublishers || input.availablePublishers.length === 0 || !input.programScheduleSlots || input.programScheduleSlots.length === 0) {
        return {
            newCaptainId: null,
            newCaptainName: null,
            newCaptainEmail: null,
            reasoning: "No publisher availability or program slot data provided to find a replacement.",
        };
    }

    const {output} = await prompt(input);
    return output!;
  }
);
