
import { USER_ROLES } from '@/lib/constants';
import type { UserRole } from '@/types';

// This file contains a list of users to be pre-registered in the system.
// The import script will use this data to create user profiles in Firestore.
// The initial status is 'Pendiente Invitación', so they won't have access
// until an admin sends them an invitation link.

export const usersToImport = [
  { name: "Camilo Torres", email: "camilo.torres@example.com", phoneNumber: "+56900000001", role: USER_ROLES.PUBLICADOR as UserRole },
  { name: "Edison Díaz", email: "edison.diaz@example.com", phoneNumber: "+56900000002", role: USER_ROLES.PUBLICADOR as UserRole },
  { name: "Robert Guale", email: "robert.guale@example.com", phoneNumber: "+56900000003", role: USER_ROLES.PUBLICADOR as UserRole },
  { name: "Esteban Vásquez", email: "esteban.vasquez@example.com", phoneNumber: "+56900000004", role: USER_ROLES.PUBLICADOR as UserRole },
  { name: "Carlos Heise", email: "carlos.heise@example.com", phoneNumber: "+56900000005", role: USER_ROLES.PUBLICADOR as UserRole },
  { name: "Jimmy Guale", email: "jimmy.guale@example.com", phoneNumber: "+56900000006", role: USER_ROLES.PUBLICADOR as UserRole },
  { name: "Gonzalo Heise", email: "gonzalo.heise@example.com", phoneNumber: "+56900000007", role: USER_ROLES.PUBLICADOR as UserRole },
  { name: "Ricardo Salas", email: "ricardo.salas@example.com", phoneNumber: "+56900000008", role: USER_ROLES.PUBLICADOR as UserRole },
  { name: "Rolando Alarcón", email: "rolando.alarcon@example.com", phoneNumber: "+56900000009", role: USER_ROLES.PUBLICADOR as UserRole },
  { name: "Jonatan Palma", email: "jonatan.palma@example.com", phoneNumber: "+56900000010", role: USER_ROLES.PUBLICADOR as UserRole },
  { name: "Cristian Pichinao", email: "cristian.pichinao@example.com", phoneNumber: "+56900000011", role: USER_ROLES.PUBLICADOR as UserRole },
  { name: "Diego Henríquez", email: "diego.henriquez@example.com", phoneNumber: "+56900000012", role: USER_ROLES.PUBLICADOR as UserRole },
  { name: "Cristian Coronado", email: "cristian.coronado@example.com", phoneNumber: "+56900000013", role: USER_ROLES.PUBLICADOR as UserRole },
  { name: "Carlos Sepúlveda", email: "carlos.sepulveda@example.com", phoneNumber: "+56900000014", role: USER_ROLES.PUBLICADOR as UserRole },
  { name: "Javier Heise", email: "javier.heise@example.com", phoneNumber: "+56900000015", role: USER_ROLES.PUBLICADOR as UserRole },
  { name: "Omar Salas", email: "omar.salas@example.com", phoneNumber: "+56900000016", role: USER_ROLES.PUBLICADOR as UserRole },
  { name: "Nelson Muci", email: "nelson.muci@example.com", phoneNumber: "+56900000017", role: USER_ROLES.PUBLICADOR as UserRole },
  { name: "Danilo", email: "danilo@example.com", phoneNumber: "+56900000018", role: USER_ROLES.PUBLICADOR as UserRole },
  { name: "Martín Sandoval", email: "martin.sandoval@example.com", phoneNumber: "+56900000019", role: USER_ROLES.PUBLICADOR as UserRole },
  { name: "Cristian Martínez", email: "cristian.martinez@example.com", phoneNumber: "+56900000020", role: USER_ROLES.PUBLICADOR as UserRole },
];
