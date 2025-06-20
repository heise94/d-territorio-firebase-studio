
'use server';

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestTerritoryInputSchema = z.object({
  groupId: z
    .string()
    .describe('The ID of the preaching group to suggest a territory for.'),
});
export type SuggestTerritoryInput = z.infer<typeof SuggestTerritoryInputSchema>;

const SuggestTerritoryOutputSchema = z.object({
  territoryId: z.string().describe('The ID of the suggested territory.'),
  territoryName: z.string().describe('The name of the suggested territory.'),
  reason: z
    .string()
    .describe('The reason why this territory is being suggested.'),
});
export type SuggestTerritoryOutput = z.infer<typeof SuggestTerritoryOutputSchema>;

export async function suggestTerritory(input: SuggestTerritoryInput): Promise<SuggestTerritoryOutput> {
  return suggestTerritoryFlow(input); 
}

const prompt = ai.definePrompt({
  name: 'suggestTerritoryPrompt',
  input: {schema: SuggestTerritoryInputSchema},
  output: {schema: SuggestTerritoryOutputSchema},
  prompt: `You are an AI assistant designed to suggest the best territory for a preaching group to work on.

You will receive the group ID and must return the ID and Name of the most suitable territory for them to work on, as well as the reasons for the suggestion.

Consider the following factors when making your suggestion:

*   Territories assigned to the group.
*   The last worked date of each territory.
*   The current status of each territory.

Return the territory ID, territory name, and a brief explanation of why you are suggesting this territory.

Group ID: {{{groupId}}}
`,
});

const suggestTerritoryFlow = ai.defineFlow(
  {
    name: 'suggestTerritoryFlow',
    inputSchema: SuggestTerritoryInputSchema,
    outputSchema: SuggestTerritoryOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
