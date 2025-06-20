
import { config } from 'dotenv';
config();

import '@/ai/flows/generate-monthly-assignments.ts'; 
import '@/ai/flows/suggest-territory.ts';           
import '@/ai/flows/find-replacement-captain.ts';    

