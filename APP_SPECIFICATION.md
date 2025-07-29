
# Especificación Técnica y Funcional: D-TERRITORIO

## 1. Visión General

**D-TERRITORIO** es una aplicación web progresiva (PWA) diseñada para la gestión integral de actividades de una congregación. Construida con una arquitectura modular, permite una fácil expansión a diversos departamentos (Territorios, Aseo, Contabilidad, etc.). El sistema está diseñado para ser multi-tenant en el futuro (SaaS).

---

## 🎨 DISEÑO Y ESTILOS (UI/UX)

Nuestra filosofía de diseño se basa en la simplicidad, la claridad y la eficiencia. Utilizamos un sistema de diseño predefinido que garantiza la consistencia visual y acelera el desarrollo.

### 1. Paleta de Colores

Los colores se definen en `src/app/globals.css` usando variables CSS HSL para facilitar la personalización y el cambio de tema (claro/oscuro).

| Rol                 | Variable CSS      | HSL (Valor)         | HEX (Aproximado) | Descripción                                         |
| ------------------- | ----------------- | ------------------- | ---------------- | --------------------------------------------------- |
| **Fondo Principal** | `--background`    | `220 16% 96%`       | `#F2F4F7`        | Color de fondo principal para el tema claro.        |
| **Texto Principal** | `--foreground`    | `220 10% 20%`       | `#2E333D`        | Color de texto principal para máxima legibilidad.   |
| **Primario**        | `--primary`       | `158 64% 52%`       | `#34D399`        | Verde esmeralda para acciones principales y énfasis. |
| **Texto Primario**  | `--primary-fore`  | `0 0% 100%`         | `#FFFFFF`        | Texto sobre elementos con color primario.           |
| **Secundario**      | `--secondary`     | `220 10% 90%`       | `#E2E5E9`        | Para fondos de elementos secundarios (ej. badges).  |
| **Acento**          | `--accent`        | `43 96% 58%`        | `#F5B82A`        | Amarillo/dorado para destacar elementos (hover).    |
| **Destructivo**     | `--destructive`   | `0 72% 51%`         | `#E53E3E`        | Rojo para acciones de eliminación o peligro.        |
| **Bordes**          | `--border`        | `220 10% 80%`       | `#C4C9D2`        | Color para bordes de contenedores e inputs.         |
| **Inputs**          | `--input`         | `220 10% 88%`       | ` #DDE1E6`        | Fondo para campos de formulario.                    |

*Nota: El tema oscuro utiliza las mismas variables pero con valores HSL diferentes para adaptarse a fondos oscuros, manteniendo la consistencia de la marca.*

### 2. Tipografías

- **Fuente Principal:** `Inter` (importada desde Google Fonts en `src/app/layout.tsx`). Se utiliza para todo el texto de la aplicación, desde el cuerpo hasta los títulos.
- **Jerarquía y Tamaños (Tailwind CSS):**
  - `<h1>` / `.text-3xl`: Títulos de página principales.
  - `<h2>` / `.text-2xl`: Títulos de sección importantes.
  - `<h3>` / `.text-xl`: Títulos de tarjetas o subsecciones.
  - `<h4>` / `.text-lg`: Títulos menores.
  - **Cuerpo de texto:** `.text-sm` (14px) o `.text-base` (16px).
  - **Texto pequeño/muted:** `.text-xs` (12px).
- **Estilos:** Se utilizan las clases de Tailwind: `font-bold`, `font-semibold`, `font-medium`, `italic`.
- **Espaciado de Línea (Leading):** Se utiliza el espaciado por defecto de Tailwind, que es `leading-normal` (1.5) para el cuerpo de texto, garantizando una excelente legibilidad.

### 3. Espaciado y Layout

- **Sistema de Espaciado:** Usamos la escala de espaciado de Tailwind (múltiplos de 4px). Ej: `p-4` (16px padding), `m-6` (24px margin), `gap-4` (16px de espacio entre elementos).
- **Layout Principal:** Un grid de CSS (`flex` y `grid`) se usa para la estructura principal. La página de `layout.tsx` define la barra lateral y el área de contenido principal.
- **Breakpoints Responsivos:** Se utilizan los breakpoints por defecto de Tailwind:
  - `sm`: 640px
  - `md`: 768px (punto clave donde aparece la barra lateral)
  - `lg`: 1024px
  - `xl`: 1280px

---

## 📱 COMPONENTES UI (ShadCN/UI + Tailwind CSS)

Los componentes residen en `src/components/ui/` y se estilizan con clases de Tailwind. No hay archivos CSS separados por componente.

### 4. Botones (`src/components/ui/button.tsx`)

| Variante      | Clases Clave (Tailwind)              | Descripción                                      |
| ------------- | ------------------------------------ | ------------------------------------------------ |
| **Primario**  | `bg-primary text-primary-foreground` | Botón por defecto para acciones principales.     |
| **Secundario**| `bg-secondary text-secondary-fore..` | Para acciones menos importantes.                 |
| **Destructivo**|`bg-destructive text-destructive-..`| Para acciones de borrado o peligrosas.           |
| **Outline**   | `border border-input bg-background`  | Botón con borde, sin relleno.                    |
| **Ghost**     | `hover:bg-accent hover:text-accent-..` | Sin borde ni fondo, para acciones sutiles (íconos). |
| **Link**      | `text-primary underline`             | Apariencia de un enlace.                         |

- **Estados:** Tailwind maneja los estados `hover:`, `focus:`, `disabled:`. Por ejemplo, `hover:bg-primary/90` oscurece ligeramente el botón primario al pasar el cursor. `disabled:opacity-50` lo hace semitransparente.

### 5. Formularios (`src/components/ui/input.tsx`, `form.tsx`, `label.tsx`)

- **Inputs:** Fondo `bg-background`, borde `border-input`. Al hacer foco (`focus-visible:`), se aplica un anillo de color primario (`ring-ring`).
- **Labels:** Texto mediano (`font-medium`) por defecto.
- **Mensajes de Error:** Texto pequeño (`text-sm`) de color destructivo (`text-destructive`).

### 6. Cards y Contenedores (`src/components/ui/card.tsx`)

- **Estilo Base:** Borde (`border`), fondo (`bg-card`), y una sombra suave (`shadow-sm`).
- **Estructura:** Compuesto por `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, y `CardFooter` para una estructura semántica y consistente.

### 7. Navegación

- **Menú Principal (`src/app/(app)/layout.tsx`):** Un layout de `div` con flexbox que contiene el menú lateral. En móvil, se oculta y se muestra a través de un componente `Sheet` (menú deslizable).
- **Menú Lateral (`src/components/layout/sidebar-nav.tsx`):** Una lista de enlaces (`<Link>`). El enlace activo se resalta con un fondo (`bg-muted`) y texto de color primario (`text-primary`). Utiliza componentes `Accordion` para los sub-menús.
- **Navegación Móvil (`src/components/layout/mobile-bottom-nav.tsx`):** Una barra fija en la parte inferior de la pantalla (`position: fixed`), visible solo en pantallas `md` o más pequeñas.

---

## 📄 PÁGINAS ESPECÍFICAS

A continuación se detalla la estructura de las páginas clave. "HTML" se refiere al JSX del componente React, y "CSS" a las clases de Tailwind utilizadas.

### PÁGINA DE LOGIN (`src/app/page.tsx`)

-   **HTML (JSX):** Un componente `Card` que contiene un `CardHeader` para el título y un `CardContent` con el componente `LoginForm`.
-   **CSS (Tailwind):** Se utilizan clases de `flexbox` y `items-center`, `justify-center` para centrar la tarjeta en la pantalla.
-   **Formulario (`src/components/auth/login-form.tsx`):**
    -   Construido con `react-hook-form` y `zod` para validación.
    -   Campos: `email` (con validación de formato) y `password` (con validación de longitud mínima).
    -   Utiliza los componentes `Input`, `Label` y `Button` de ShadCN.

### DASHBOARD/HOME (`src/app/(app)/dashboard/page.tsx`)

-   **HTML (JSX):** Un `div` principal con `space-y-8`. Contiene un título `<h1>` y un `div` con `grid` que se adapta responsive (`md:grid-cols-2 lg:grid-cols-3`).
-   **CSS (Tailwind):** `grid`, `gap-6` para el espaciado de las tarjetas. Cada tarjeta de módulo es un componente `Link` que envuelve una `Card`.
-   **Lógica:** Mapea sobre un array de `modules` y filtra los que el usuario tiene permiso para ver usando el hook `usePermissions`.

### LISTA DE TERRITORIOS (`src/app/(app)/territorios/page.tsx`)

-   **HTML (JSX):**
    -   Un componente `Tabs` para cambiar entre "Urbanos" y "Rurales".
    -   `TabsContent` contiene el grid de tarjetas o la tabla.
    -   Se usa un `div` con `grid` y `gap-6` para la vista de tarjetas (`TerritoryCard`).
    -   Se usa un componente `Table` para la vista de lista.
-   **CSS (Tailwind):** Clases de `grid`, `flex`, `justify-between`, `items-center` son usadas extensivamente para el layout.
-   **Filtros y Búsqueda:**
    -   Un `Input` con un ícono de `Search` para la búsqueda por texto.
    -   Componentes `Select` de ShadCN para filtrar por grupo, casa y estado.
    -   La lógica de filtrado y ordenamiento se realiza en el cliente con `useMemo`.

### FORMULARIO AGREGAR/EDITAR TERRITORIO (`src/components/territorios/add-territory-dialog.tsx`)

-   **HTML (JSX):** Un componente `Dialog` que contiene un `Form` de `react-hook-form`.
-   **Campos del Formulario:**
    -   `type`: `Select` para 'urban' o 'rural'.
    -   `number`: `Input` de texto (visible si es urbano).
    -   `name`: `Input` de texto (visible si es rural).
    -   `mapImageUrl`: `Input` de tipo `file` para subir la imagen del mapa.
    -   `totalBlocks`: `Input` numérico.
    -   `blockHouseCounts`: `Input`s numéricos generados dinámicamente según `totalBlocks`.
    -   `groupIds`, `associatedCasaIds`: `DropdownMenu` con `DropdownMenuCheckboxItem` para selección múltiple.
-   **Validaciones:** Se usa `zod` para definir el `territoryFormSchema`. Valida que el número sea obligatorio para urbanos, la longitud mínima de los textos, y que las URLs sean válidas.

---

## 🗄️ ESTRUCTURA DE DATOS (FIRESTORE)

### 9. Colecciones de Firestore

-   **`users`**:
    -   Estructura: Ver `UserProfile` en `src/types/index.ts`.
    -   Campos clave: `id`, `name`, `email`, `role`, `status`, `assignedGroupId`, `firebaseAuthUid`, `availability`.

-   **`territories`**:
    -   Estructura: Ver `Territory` en `src/types/index.ts`.
    -   Campos clave: `id`, `name`, `number`, `type`, `isBlocked`, `lastWorked`, `groupIds`, `associatedCasaIds`.

-   **`casas`**:
    -   Estructura: Ver `Casa` en `src/types/index.ts`.
    -   Campos clave: `id`, `ownerName`, `address`, `blockInfo`, `availableDays`, `addedByGroupId`.

-   **`preachingGroups`**:
    -   Estructura: Ver `PreachingGroup` en `src/types/index.ts`.
    -   Campos clave: `id`, `name`, `superintendentId`, `auxiliaryId`.

-   **`assignments`**:
    -   Estructura: Ver `Assignment` en `src/types/index.ts`.
    -   Colección principal para asignaciones del programa general.

-   **`groupAssignments`**:
    -   Estructura: Ver `GroupAssignment` en `src/types/index.ts`.
    -   Asignaciones internas creadas por los SG para su grupo.

-   **`cleaningAssignments`, `cleaningGroups`**:
    -   Colecciones para el módulo de Aseo.

-   **`settings`**:
    -   Colección de documentos únicos que actúan como configuración global.
    -   Documento `programConfig`: Guarda horarios, días de grupo, etc.
    -   Documento `rolePermissions`: Guarda los permisos para cada rol.
    -   Documento `specialEventsConfig`: Guarda campañas, festivos, etc.

### 10. Reglas de Seguridad

-   **Firestore Rules:** No se proporcionan en el código del proyecto, ya que se configuran directamente en la consola de Firebase. Deben ser escritas para reflejar la lógica de permisos:
    -   Los usuarios solo pueden leer/escribir su propio perfil (`/users/{userId}`).
    -   Los `Encargado Territorio` deben tener acceso de lectura/escritura a casi todas las colecciones.
    -   Los `SG` deben poder escribir en `groupAssignments` para su propio `groupId`.
    -   La colección `settings` solo debe ser editable por `Encargado Territorio`.
-   **Authentication:** Se usa el proveedor de Email/Contraseña de Firebase Auth.

---

## ⚙️ FUNCIONALIDADES

### 11. Flujos de Trabajo

-   **Asignación de Territorios (IA - Próximamente):** Un flujo de Genkit (`generateMonthlyProgram` - por implementar) tomará en cuenta la disponibilidad de usuarios, el historial de territorios y las campañas activas para crear un borrador del programa mensual.
-   **Gestión de Usuarios:**
    1.  Admin crea un usuario (estado: `Pendiente Invitación`).
    2.  Admin envía una invitación (link con email).
    3.  Usuario abre el link, crea su contraseña. El sistema lo marca como `Activo`.
-   **Programa de Grupo:**
    1.  Un `SG` va a `/mi-grupo/programa`.
    2.  Añade una asignación para un día y hora permitidos.
    3.  Selecciona un encargado y una casa de su grupo.
    4.  Puede opcionalmente usar la IA para sugerir un territorio y asignarlo al capitán.

### 12. Integraciones

-   **Firebase:** Auth, Firestore.
-   **Genkit (Google AI):** Para todos los flujos de IA (Gemini).
-   **APIs Externas:** No se utilizan APIs externas de terceros más allá de los servicios de Google Cloud/Firebase.

---

## 📱 RESPONSIVE DESIGN

### 13. Adaptaciones Móviles

-   **Breakpoints:** El breakpoint principal es `md` (768px).
-   **Layout Móvil:**
    -   Las `grid` de tarjetas pasan de 3 columnas a 1 o 2.
    -   El menú lateral principal se oculta y es reemplazado por la barra de navegación inferior.
-   **Navegación Móvil (`src/components/layout/mobile-bottom-nav.tsx`):**
    -   Una barra `<footer>` fija en la parte inferior.
    -   Muestra íconos y títulos para las secciones más importantes a las que el usuario tiene acceso.
    -   Permite un acceso rápido y táctil a las funciones clave.
-   **Diálogos y Formularios:** Son responsive por naturaleza gracias a ShadCN. En móvil, ocupan un mayor porcentaje del ancho de la pantalla para mejorar la usabilidad.
