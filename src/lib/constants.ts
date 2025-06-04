export const USER_ROLES = {
  ENCARGADO_TERRITORIO: "Encargado Territorio",
  PUBLICADOR: "Publicador",
  SS: "SS", // Superintendente de Servicio
  SG: "SG",   // Superintendente de Grupo
  AUXILIAR_TERRITORIO: "Auxiliar Territorio",
} as const;

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

export const USER_ROLES_LIST = Object.values(USER_ROLES);

// Define specific permissions based on the app's functionality
export const PERMISSIONS = {
  // Dashboard
  VIEW_DASHBOARD: "view_dashboard",

  // User Management
  MANAGE_USERS: "manage_users", // Create, edit, delete, block/unblock, resend invitation
  VIEW_USERS: "view_users",
  MANAGE_ROLE_PERMISSIONS: "manage_role_permissions",
  MANAGE_OWN_AVAILABILITY: "manage_own_availability", // For /disponibilidad page
  VIEW_USER_AVAILABILITY: "view_user_availability", // For admins to see others' availability

  // Territory Management
  MANAGE_TERRITORIES: "manage_territories", // CRUD, block/unblock
  VIEW_TERRITORIES: "view_territories",
  ASSIGN_TERRITORIES_GROUP: "assign_territories_group", // Part of Mi Grupo

  // Casa (Meeting Places) Management
  MANAGE_CASAS: "manage_casas",
  VIEW_CASAS: "view_casas",

  // Preaching Group Management
  MANAGE_GROUPS: "manage_groups", // CRUD for preaching groups
  VIEW_GROUPS: "view_groups",
  MANAGE_OWN_GROUP_PROGRAM: "manage_own_group_program", // For SG/Aux in /mi-grupo/programa
  MANAGE_OWN_GROUP_PUBLISHERS: "manage_own_group_publishers", // Add publishers in /mi-grupo/publicadores
  MANAGE_OWN_GROUP_CASAS: "manage_own_group_casas", // Add casas in /mi-grupo/casas

  // Program Management (Monthly/Weekly)
  GENERATE_MONTHLY_PROGRAM: "generate_monthly_program", // AI generation
  MANAGE_MONTHLY_PROGRAM: "manage_monthly_program", // Manual edits, save, send
  VIEW_MONTHLY_PROGRAM: "view_monthly_program",
  VIEW_WEEKLY_PROGRAM: "view_weekly_program",
  ACCEPT_REJECT_ASSIGNMENTS: "accept_reject_assignments", // For users in /asignaciones
  VIEW_OWN_ASSIGNMENTS: "view_own_assignments",
  VIEW_ALL_ASSIGNMENTS: "view_all_assignments", // For admins
  ASSUME_DIRECTION_PROGRAM: "assume_direction_program", // In weekly program

  // Settings
  MANAGE_PROGRAM_SETTINGS: "manage_program_settings", // Preaching schedules, group days, rural rotation
  MANAGE_CAMPAIGNS: "manage_campaigns",
  MANAGE_CUSTOM_HOLIDAYS: "manage_custom_holidays",

  // Reports
  VIEW_REPORTS: "view_reports",
  EXPORT_REPORTS: "export_reports",
  
} as const;

export type PermissionId = typeof PERMISSIONS[keyof typeof PERMISSIONS];
export const PERMISSION_LIST = Object.values(PERMISSIONS);

export const PERMISSION_MODULES = {
  DASHBOARD: "Dashboard",
  USERS: "Usuarios",
  TERRITORIES: "Territorios",
  CASAS: "Casas",
  GROUPS: "Grupos de Predicación",
  PROGRAM: "Programa General",
  ASSIGNMENTS: "Asignaciones",
  MY_GROUP: "Mi Grupo",
  REPORTS: "Reportes",
  SETTINGS: "Configuración General",
} as const;

export type PermissionModule = typeof PERMISSION_MODULES[keyof typeof PERMISSION_MODULES];

// Default role permissions to be stored/managed in Firestore `settings/rolePermissions`
// This is a more comprehensive example based on potential needs.
export const DEFAULT_ROLE_PERMISSIONS: { [key in UserRole]?: PermissionId[] } = {
  [USER_ROLES.ENCARGADO_TERRITORIO]: [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.MANAGE_USERS, PERMISSIONS.VIEW_USERS, PERMISSIONS.MANAGE_ROLE_PERMISSIONS, PERMISSIONS.VIEW_USER_AVAILABILITY,
    PERMISSIONS.MANAGE_TERRITORIES, PERMISSIONS.VIEW_TERRITORIES,
    PERMISSIONS.MANAGE_CASAS, PERMISSIONS.VIEW_CASAS,
    PERMISSIONS.MANAGE_GROUPS, PERMISSIONS.VIEW_GROUPS,
    PERMISSIONS.GENERATE_MONTHLY_PROGRAM, PERMISSIONS.MANAGE_MONTHLY_PROGRAM, PERMISSIONS.VIEW_MONTHLY_PROGRAM,
    PERMISSIONS.VIEW_WEEKLY_PROGRAM, PERMISSIONS.ASSUME_DIRECTION_PROGRAM,
    PERMISSIONS.VIEW_ALL_ASSIGNMENTS, PERMISSIONS.ACCEPT_REJECT_ASSIGNMENTS, PERMISSIONS.VIEW_OWN_ASSIGNMENTS,
    PERMISSIONS.MANAGE_OWN_AVAILABILITY,
    PERMISSIONS.MANAGE_PROGRAM_SETTINGS, PERMISSIONS.MANAGE_CAMPAIGNS, PERMISSIONS.MANAGE_CUSTOM_HOLIDAYS,
    PERMISSIONS.VIEW_REPORTS, PERMISSIONS.EXPORT_REPORTS,
    PERMISSIONS.MANAGE_OWN_GROUP_PROGRAM, PERMISSIONS.MANAGE_OWN_GROUP_PUBLISHERS, PERMISSIONS.MANAGE_OWN_GROUP_CASAS, // Can manage ANY group
  ],
  [USER_ROLES.AUXILIAR_TERRITORIO]: [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.VIEW_USERS, PERMISSIONS.VIEW_USER_AVAILABILITY,
    PERMISSIONS.MANAGE_TERRITORIES, PERMISSIONS.VIEW_TERRITORIES, // Can assist with territories
    PERMISSIONS.MANAGE_CASAS, PERMISSIONS.VIEW_CASAS, // Can assist with casas
    PERMISSIONS.VIEW_GROUPS,
    PERMISSIONS.MANAGE_MONTHLY_PROGRAM, PERMISSIONS.VIEW_MONTHLY_PROGRAM, // Can assist with program
    PERMISSIONS.VIEW_WEEKLY_PROGRAM, PERMISSIONS.ASSUME_DIRECTION_PROGRAM,
    PERMISSIONS.VIEW_ALL_ASSIGNMENTS, PERMISSIONS.ACCEPT_REJECT_ASSIGNMENTS, PERMISSIONS.VIEW_OWN_ASSIGNMENTS,
    PERMISSIONS.MANAGE_OWN_AVAILABILITY,
    PERMISSIONS.VIEW_REPORTS,
  ],
  [USER_ROLES.SS]: [ // Superintendente de Servicio
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.VIEW_USERS, PERMISSIONS.VIEW_USER_AVAILABILITY,
    PERMISSIONS.VIEW_TERRITORIES,
    PERMISSIONS.VIEW_CASAS,
    PERMISSIONS.VIEW_GROUPS,
    PERMISSIONS.VIEW_MONTHLY_PROGRAM, PERMISSIONS.VIEW_WEEKLY_PROGRAM,
    PERMISSIONS.VIEW_ALL_ASSIGNMENTS, PERMISSIONS.ACCEPT_REJECT_ASSIGNMENTS, PERMISSIONS.VIEW_OWN_ASSIGNMENTS,
    PERMISSIONS.MANAGE_OWN_AVAILABILITY,
    PERMISSIONS.VIEW_REPORTS,
  ],
  [USER_ROLES.SG]: [ // Superintendente de Grupo
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.VIEW_USERS, // View users in their group?
    PERMISSIONS.VIEW_TERRITORIES, // View territories assigned to their group
    PERMISSIONS.VIEW_CASAS, // View casas relevant to their group
    PERMISSIONS.VIEW_GROUPS, // View their own group details
    PERMISSIONS.VIEW_MONTHLY_PROGRAM, PERMISSIONS.VIEW_WEEKLY_PROGRAM,
    PERMISSIONS.ACCEPT_REJECT_ASSIGNMENTS, PERMISSIONS.VIEW_OWN_ASSIGNMENTS,
    PERMISSIONS.MANAGE_OWN_AVAILABILITY,
    PERMISSIONS.MANAGE_OWN_GROUP_PROGRAM,
    PERMISSIONS.MANAGE_OWN_GROUP_PUBLISHERS,
    PERMISSIONS.MANAGE_OWN_GROUP_CASAS,
    PERMISSIONS.ASSIGN_TERRITORIES_GROUP,
    PERMISSIONS.VIEW_REPORTS, // View reports for their group
  ],
  [USER_ROLES.PUBLICADOR]: [
    PERMISSIONS.VIEW_DASHBOARD, // Limited dashboard view
    PERMISSIONS.VIEW_WEEKLY_PROGRAM, // To see their assignments
    PERMISSIONS.ACCEPT_REJECT_ASSIGNMENTS, PERMISSIONS.VIEW_OWN_ASSIGNMENTS,
    PERMISSIONS.MANAGE_OWN_AVAILABILITY,
  ],
};
