
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
  
  // Report Management
  VIEW_REPORTS: "view_reports",

  // Settings
  MANAGE_PROGRAM_SETTINGS: "manage_program_settings", // Preaching schedules, group days, rural rotation
  MANAGE_CAMPAIGNS: "manage_campaigns",
  MANAGE_CUSTOM_HOLIDAYS: "manage_custom_holidays",
  MANAGE_ASSEMBLIES: "manage_assemblies", // New permission for assemblies
  
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

export interface PermissionDetail {
  id: PermissionId;
  description: string;
}

export interface ModulePermissions {
  moduleName: PermissionModule;
  moduleDescription: string;
  permissions: PermissionDetail[];
}

export const PERMISSIONS_BY_MODULE: ModulePermissions[] = [
  {
    moduleName: PERMISSION_MODULES.DASHBOARD,
    moduleDescription: "Acceso y visualización del dashboard principal.",
    permissions: [
      { id: PERMISSIONS.VIEW_DASHBOARD, description: "Ver el dashboard" },
    ],
  },
  {
    moduleName: PERMISSION_MODULES.USERS,
    moduleDescription: "Gestión de usuarios, roles e invitaciones.",
    permissions: [
      { id: PERMISSIONS.VIEW_USERS, description: "Ver lista de usuarios" },
      { id: PERMISSIONS.MANAGE_USERS, description: "Crear, editar, eliminar, bloquear/desbloquear usuarios y reenviar invitaciones" },
      { id: PERMISSIONS.MANAGE_ROLE_PERMISSIONS, description: "Gestionar permisos para cada rol de usuario (Página de Configuración)" },
      { id: PERMISSIONS.VIEW_USER_AVAILABILITY, description: "Ver la disponibilidad de otros usuarios" },
    ],
  },
  {
    moduleName: PERMISSION_MODULES.TERRITORIES,
    moduleDescription: "Administración de territorios de predicación.",
    permissions: [
      { id: PERMISSIONS.VIEW_TERRITORIES, description: "Ver lista de territorios" },
      { id: PERMISSIONS.MANAGE_TERRITORIES, description: "Crear, editar, eliminar y bloquear/desbloquear territorios" },
    ],
  },
  {
    moduleName: PERMISSION_MODULES.CASAS,
    moduleDescription: "Administración de casas de reunión.",
    permissions: [
      { id: PERMISSIONS.VIEW_CASAS, description: "Ver lista de casas de reunión" },
      { id: PERMISSIONS.MANAGE_CASAS, description: "Crear, editar, eliminar y bloquear/desbloquear casas" },
    ],
  },
  {
    moduleName: PERMISSION_MODULES.GROUPS,
    moduleDescription: "Administración de grupos de predicación.",
    permissions: [
      { id: PERMISSIONS.VIEW_GROUPS, description: "Ver lista de grupos de predicación" },
      { id: PERMISSIONS.MANAGE_GROUPS, description: "Crear, editar y eliminar grupos de predicación" },
    ],
  },
  {
    moduleName: PERMISSION_MODULES.PROGRAM,
    moduleDescription: "Gestión y visualización del programa de predicación general.",
    permissions: [
      { id: PERMISSIONS.VIEW_MONTHLY_PROGRAM, description: "Ver programa mensual general" },
      { id: PERMISSIONS.GENERATE_MONTHLY_PROGRAM, description: "Generar programa mensual con IA" },
      { id: PERMISSIONS.MANAGE_MONTHLY_PROGRAM, description: "Editar, guardar y publicar programa mensual" },
      { id: PERMISSIONS.VIEW_WEEKLY_PROGRAM, description: "Ver programa semanal general" },
      { id: PERMISSIONS.ASSUME_DIRECTION_PROGRAM, description: "Solicitar dirigir una predicación del programa semanal si el encargado no puede" },
    ],
  },
  {
    moduleName: PERMISSION_MODULES.ASSIGNMENTS,
    moduleDescription: "Gestión y visualización de asignaciones individuales y generales.",
    permissions: [
      { id: PERMISSIONS.VIEW_OWN_ASSIGNMENTS, description: "Ver mis propias asignaciones" },
      { id: PERMISSIONS.ACCEPT_REJECT_ASSIGNMENTS, description: "Aceptar o rechazar mis asignaciones" },
      { id: PERMISSIONS.VIEW_ALL_ASSIGNMENTS, description: "Ver todas las asignaciones de todos los usuarios (Admin)" },
      { id: PERMISSIONS.MANAGE_OWN_AVAILABILITY, description: "Gestionar mi propia disponibilidad horaria" },
    ],
  },
   {
    moduleName: PERMISSION_MODULES.REPORTS,
    moduleDescription: "Visualización de reportes de territorios como el S-13.",
    permissions: [
      { id: PERMISSIONS.VIEW_REPORTS, description: "Ver la página de Reportes" },
    ],
  },
  {
    moduleName: PERMISSION_MODULES.MY_GROUP,
    moduleDescription: "Herramientas específicas para Superintendentes de Grupo (SG).",
    permissions: [
      { id: PERMISSIONS.MANAGE_OWN_GROUP_PROGRAM, description: "Gestionar el programa de predicación de mi grupo" },
      { id: PERMISSIONS.ASSIGN_TERRITORIES_GROUP, description: "Asignar territorios específicos a las salidas de mi grupo"},
      { id: PERMISSIONS.MANAGE_OWN_GROUP_PUBLISHERS, description: "Invitar y ver publicadores de mi grupo" },
      { id: PERMISSIONS.MANAGE_OWN_GROUP_CASAS, description: "Gestionar casas de reunión para mi grupo" },
    ],
  },
  {
    moduleName: PERMISSION_MODULES.SETTINGS,
    moduleDescription: "Configuraciones generales de la aplicación.",
    permissions: [
      { id: PERMISSIONS.MANAGE_PROGRAM_SETTINGS, description: "Ajustar horarios del programa semanal y días de grupo" },
      { id: PERMISSIONS.MANAGE_CAMPAIGNS, description: "Gestionar campañas especiales de predicación" },
      { id: PERMISSIONS.MANAGE_CUSTOM_HOLIDAYS, description: "Gestionar días festivos personalizados" },
      { id: PERMISSIONS.MANAGE_ASSEMBLIES, description: "Gestionar fechas de asambleas (Circuito, Regional, etc.)" },
      // Nota: MANAGE_ROLE_PERMISSIONS está aquí porque es una config global, pero afecta "Usuarios".
    ],
  },
];


export const DEFAULT_ROLE_PERMISSIONS: { [key in UserRole]?: PermissionId[] } = {
  [USER_ROLES.ENCARGADO_TERRITORIO]: PERMISSION_LIST, // Admin has all permissions
  [USER_ROLES.AUXILIAR_TERRITORIO]: [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.VIEW_USERS, PERMISSIONS.VIEW_USER_AVAILABILITY,
    PERMISSIONS.MANAGE_TERRITORIES, PERMISSIONS.VIEW_TERRITORIES,
    PERMISSIONS.MANAGE_CASAS, PERMISSIONS.VIEW_CASAS,
    PERMISSIONS.VIEW_GROUPS,
    PERMISSIONS.MANAGE_MONTHLY_PROGRAM, PERMISSIONS.VIEW_MONTHLY_PROGRAM,
    PERMISSIONS.VIEW_WEEKLY_PROGRAM, PERMISSIONS.ASSUME_DIRECTION_PROGRAM,
    PERMISSIONS.VIEW_ALL_ASSIGNMENTS, PERMISSIONS.ACCEPT_REJECT_ASSIGNMENTS, PERMISSIONS.VIEW_OWN_ASSIGNMENTS,
    PERMISSIONS.MANAGE_OWN_AVAILABILITY,
    PERMISSIONS.VIEW_REPORTS,
  ],
  [USER_ROLES.SS]: [ 
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
  [USER_ROLES.SG]: [ 
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.VIEW_TERRITORIES, 
    PERMISSIONS.VIEW_CASAS, 
    PERMISSIONS.VIEW_GROUPS, 
    PERMISSIONS.VIEW_MONTHLY_PROGRAM, PERMISSIONS.VIEW_WEEKLY_PROGRAM,
    PERMISSIONS.ACCEPT_REJECT_ASSIGNMENTS, PERMISSIONS.VIEW_OWN_ASSIGNMENTS,
    PERMISSIONS.MANAGE_OWN_AVAILABILITY,
    PERMISSIONS.MANAGE_OWN_GROUP_PROGRAM,
    PERMISSIONS.MANAGE_OWN_GROUP_PUBLISHERS,
    PERMISSIONS.MANAGE_OWN_GROUP_CASAS,
    PERMISSIONS.ASSIGN_TERRITORIES_GROUP,
    PERMISSIONS.VIEW_REPORTS,
  ],
  [USER_ROLES.PUBLICADOR]: [
    PERMISSIONS.VIEW_DASHBOARD, 
    PERMISSIONS.VIEW_WEEKLY_PROGRAM, 
    PERMISSIONS.ACCEPT_REJECT_ASSIGNMENTS, PERMISSIONS.VIEW_OWN_ASSIGNMENTS,
    PERMISSIONS.MANAGE_OWN_AVAILABILITY,
  ],
};
