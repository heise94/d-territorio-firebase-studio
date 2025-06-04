import { config } from 'dotenv';
config();

import '@/ai/flows/generate-monthly-assignments.ts';
import '@/ai/flows/suggest-territory.ts';