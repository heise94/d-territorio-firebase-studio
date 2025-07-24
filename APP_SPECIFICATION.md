
# Especificación Técnica y Funcional: D-TERRITORIO

## 1. Visión General

**D-TERRITORIO** es una aplicación web progresiva (PWA) diseñada para la gestión integral de actividades de una congregación, con un enfoque inicial en la administración de territorios de predicación. La plataforma está construida con una arquitectura modular para permitir una fácil expansión a otros departamentos como Aseo, Contabilidad, etc.

El sistema está diseñado para ser multi-tenant en el futuro (SaaS), permitiendo que múltiples congregaciones utilicen la misma plataforma con sus datos aislados.

### 1.1. Stack Tecnológico

*   **Framework Frontend y Backend:** [Next.js](https://nextjs.org/) con React y TypeScript. Se utiliza el App Router para la estructura de rutas.
*   **Base de Datos:** [Firebase Firestore](https://firebase.google.com/docs/firestore) (NoSQL, en tiempo real).
*   **Autenticación:** [Firebase Authentication](https://firebase.google.com/docs/auth).
*   **Inteligencia Artificial:** [Genkit (Google AI)](https://firebase.google.com/docs/genkit) para flujos de IA, integrado con modelos de Gemini.
*   **UI/Componentes:** [ShadCN/UI](https://ui.shadcn.com/) sobre Tailwind CSS.
*   **Iconos:** [Lucide React](https://lucide.dev/guide/packages/lucide-react).
*   **Estilo:** [Tailwind CSS](https://tailwindcss.com/).

## 2. Arquitectura de la Aplicación

La aplicación sigue una arquitectura modular y un modelo de frontend/backend desacoplado (aunque servido desde el mismo Next.js).

### 2.1. Estructura Modular

El código está organizado en "módulos" para separar las responsabilidades. Cada módulo principal reside en `src/modules/`.

*   `src/modules/territories`: Contiene toda la lógica, páginas y componentes relacionados con la gestión de territorios (casas, grupos, programa, reportes, etc.).
*   `src/modules/cleaning`: Contiene la lógica para el programa de aseo.
*   *Futuros módulos (ej. `accounting`, `inventory`) seguirán esta misma estructura.*

El `dashboard` principal (`src/app/(app)/dashboard/page.tsx`) actúa como un portal, mostrando tarjetas para cada módulo al que el usuario tiene acceso.

### 2.2. Frontend y Backend

*   **Frontend:** Construido con componentes de React (`.tsx`) que se renderizan tanto en el servidor (RSC) como en el cliente.
*   **Backend (Lógica de Negocio):** Se implementa utilizando **Next.js Server Actions**. Estas son funciones asíncronas que se ejecutan en el servidor y pueden ser llamadas directamente desde los componentes del cliente, eliminando la necesidad de crear rutas de API explícitas para la mayoría de las operaciones CRUD.
*   **APIs de IA:** Los flujos de Genkit se definen en `src/ai/flows/` y se exponen como Server Actions para ser consumidos por el cliente.

## 3. Sistema de Diseño y UI/UX

*   **Componentes:** La interfaz se construye utilizando los componentes predefinidos de ShadCN/UI, que se encuentran en `src/components/ui/`.
*   **Tema y Estilo:** Los colores, fuentes y estilos generales se definen en `src/app/globals.css` y `tailwind.config.ts`. Se utiliza un sistema de variables CSS con HSL para una fácil personalización del tema (claro/oscuro).
*   **Layouts:**
    *   `src/app/layout.tsx`: Layout raíz global.
    *   `src/app/(app)/layout.tsx`: Layout principal para usuarios autenticados. Contiene la barra de navegación superior.
    *   `src/modules/territories/layout.tsx`: Layout específico para el módulo de territorios, que incluye la barra de navegación lateral secundaria.

## 4. Funcionalidades Clave y Módulos

### 4.1. Autenticación y Gestión de Usuarios

*   **Flujo de Autenticación:** Se utiliza Firebase Authentication con email y contraseña. Las páginas clave son:
    *   `src/app/page.tsx`: Landing page con formulario de login.
    *   `src/app/accept-invitation/page.tsx`: Página para que nuevos usuarios creen su contraseña.
    *   `src/app/forgot-password/page.tsx`: Página para restablecer la contraseña.
*   **Gestión de Usuarios (`/usuarios`):** Permite a los administradores:
    *   Ver y buscar todos los usuarios.
    *   Añadir nuevos usuarios (se genera una invitación).
    *   Editar roles, grupo asignado y casa gestionada.
    *   Bloquear/desbloquear usuarios.
    *   Aprobar usuarios invitados por otros roles.
    *   Suplantar la identidad de otros usuarios (solo admin).
*   **Sistema de Permisos:**
    *   Los roles y permisos están definidos en `src/lib/constants.ts`.
    *   El hook `usePermissions` (`src/hooks/use-permissions.tsx`) gestiona la lógica para verificar si un usuario tiene acceso a una funcionalidad específica.
    *   La configuración de permisos por rol se almacena en Firestore (`settings/rolePermissions`) y se gestiona desde la página de Ajustes.

### 4.2. Módulo: Gestión de Territorios (`/territorios`)

#### 4.2.1. Gestión de Territorios (`/territorios`)
*   **Vista:** Tarjetas o lista con filtros y búsqueda.
*   **Funcionalidades:** CRUD completo para territorios (urbanos y rurales), bloqueo/desbloqueo, duplicación, y carga de imágenes de mapas.
*   **Componentes Clave:** `TerritoryCard`, `AddTerritoryDialog`.

#### 4.2.2. Gestión de Casas (`/casas`)
*   **Vista:** Tarjetas o lista con filtros avanzados (por grupo, estado, disponibilidad).
*   **Funcionalidades:** CRUD completo para casas de reunión, gestión de disponibilidad horaria y períodos de indisponibilidad.
*   **Componentes Clave:** `AddCasaDialog`.

#### 4.2.3. Gestión de Grupos (`/grupos`)
*   **Vista:** Tarjetas de grupos.
*   **Funcionalidades:** CRUD para grupos de predicación, asignación de superintendente y auxiliar.
*   **Componentes Clave:** `GroupCard`, `AddGroupDialog`.

#### 4.2.4. Programa (`/programa` y `/programa/semanal`)
*   **Vista Mensual:** Calendario que muestra todas las asignaciones del mes. Permite añadir asignaciones manualmente.
*   **Vista Semanal:** Vista detallada de la semana actual, con opción para que los usuarios soliciten dirigir una predicación si el encargado no puede.
*   **Funcionalidades:** Generación de imágenes del programa, gestión manual de asignaciones.
*   **Componentes Clave:** `AddManualAssignmentDialog`, `WeeklyScheduleImage`.

#### 4.2.5. Gestión de Asignaciones (`/gestion-asignaciones`)
*   **Vista:** Tabla de todas las asignaciones con filtros.
*   **Funcionalidades:**
    *   Supervisión del estado de todas las asignaciones.
    *   Búsqueda de reemplazo automático con IA (`findReplacementCaptain`).
    *   Cancelación de asignaciones.
    *   Envío de recordatorios (simulado vía WhatsApp).

#### 4.2.6. Reportes (`/reportes` y `/reportes/editor`)
*   **Vista de Reportes:** Pestañas para "Registro de Actividad" (estado actual de territorios) y "S-13" (ciclos completados).
*   **Editor de Historial:** Herramienta de administrador para ver, editar y eliminar reportes históricos de un territorio específico, con detección de duplicados.
*   **Componentes Clave:** `ReporteActividadView`, `ReporteS13View`, `AddHistoricalReportDialog`.

### 4.3. Módulo: Programa de Aseo (`/cleaning`)

*   **Vista:** Calendario mensual que muestra el grupo de aseo asignado por semana.
*   **Funcionalidades:**
    *   Creación y gestión de grupos de aseo (con capitán).
    *   Asignación de grupos a las semanas del mes a través de un diálogo.
*   **Componentes Clave:** Se encuentran en `src/modules/cleaning/`.

## 5. Estructura de Datos en Firestore (Resumen)

*   **`users`**: Almacena los perfiles de todos los usuarios, incluyendo su rol, grupo, disponibilidad y estado.
*   **`territories`**: Contiene todos los detalles de los territorios.
*   **`casas`**: Almacena las casas de reunión con su disponibilidad y detalles.
*   **`preachingGroups`**: Define los grupos de predicación.
*   **`assignments`**: La colección principal para las asignaciones personales de predicación, generadas por el sistema o manualmente.
*   **`groupAssignments`**: Asignaciones internas creadas por los SG para su grupo.
*   **`notifications`**: Registros de notificaciones para los usuarios.
*   **`cleaningGroups`**: Grupos específicos para el módulo de aseo.
*   **`cleaningAssignments`**: Asignaciones semanales del programa de aseo.
*   **`settings`**: Colección que contiene documentos de configuración global, como:
    *   **`programConfig`**: Horarios del programa, días de grupo, fechas de temporada.
    *   **`rolePermissions`**: Permisos para cada rol de usuario.
    *   **`specialEventsConfig`**: Campañas, festivos y asambleas.

Este documento proporciona una base sólida para entender la estructura y funcionamiento de la aplicación, facilitando su mantenimiento y la creación de nuevas versiones o módulos.
