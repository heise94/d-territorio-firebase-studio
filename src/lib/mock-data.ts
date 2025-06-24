
import { UserProfile } from "@/types";
import { USER_ROLES } from "@/lib/constants";
import { Timestamp } from "firebase/firestore";

// This is a centralized mock data source for development and testing.
// In a real application, this data would be fetched from Firestore.
// It is now deprecated as the Usuarios page fetches real data.
// It can be removed in a future cleanup.

export const MOCK_ALL_USERS_DATA: UserProfile[] = [];

    