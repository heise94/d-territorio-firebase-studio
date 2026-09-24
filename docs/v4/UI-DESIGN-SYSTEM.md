# D-TERRITORIO 4.0 — UI Design System

**Documento:** UI-DESIGN-SYSTEM.md  
**Versión:** 0.1  
**Fecha:** 24-09-2026  
**Estado:** Línea visual oficial

---

# 1. Objetivo

Definir la identidad visual oficial de D-TERRITORIO 4.0 para que toda la plataforma mantenga una apariencia:

- moderna;
- tecnológica;
- elegante;
- sobria;
- clara;
- premium;
- altamente usable.

La referencia principal es el mockup aprobado de la pantalla **Territorios / Spatial OS**.

---

# 2. Concepto visual

Nombre interno:

**Spatial OS**

Principios:

1. El mapa es protagonista.
2. La interfaz debe sentirse como un centro de control territorial.
3. El sistema no debe parecer una plantilla administrativa genérica.
4. El “wow” debe venir de la claridad, fluidez y visualización espacial, no de efectos excesivos.
5. Modernizar la herramienta sin volverla difícil de usar.

---

# 3. Personalidad

D-TERRITORIO debe transmitir:

- confianza;
- precisión;
- innovación;
- orden;
- simplicidad;
- control;
- tecnología.

Debe evitar:

- estética infantil;
- exceso de neón;
- sombras duras;
- demasiados gradientes;
- glassmorphism exagerado;
- colores aleatorios;
- saturación visual.

---

# 4. Tipografía

## Principal

Preferencia:

**Geist**

Fallback:

**Inter**

## Uso

- títulos principales: 600–700;
- subtítulos: 500–600;
- cuerpo: 400–500;
- labels: 500;
- métricas/códigos: Geist Mono opcionalmente.

## Tamaños sugeridos

- display: 32–40 px;
- título de pantalla: 24–30 px;
- sección: 18–20 px;
- cuerpo: 14–16 px;
- secundario: 13–14 px;
- microtexto: 12 px.

Regla: nunca sacrificar legibilidad por estética.

---

# 5. Paleta

## Fondos

- Background principal: #F4F7F8
- Background secundario: #EEF2F4
- Surface principal: #FFFFFF
- Surface suave: #F8FAFB

## Sidebar

- #08141B
- #0B1D26
- #102833

## Texto

- principal: #12212A
- secundario: #5E707A
- muted: #87979F

## Bordes

- #DCE5E8
- #E6EDF0

## Marca

- primary teal: #12D6A0
- primary hover: #0FC292
- primary dark: #0E8E72
- accent glow: #4CE6BE

## Estados

- success: #1DBF73
- warning: #F2B544
- danger: #E05A5A
- info: #4C86FF
- neutral: #A4B3BB

---

# 6. Layout global

La aplicación debe usar:

1. sidebar izquierdo oscuro;
2. topbar clara;
3. área principal;
4. panel contextual derecho cuando corresponda;
5. mapa o contenido principal de alta prioridad visual.

El sidebar debe poder contraerse.

---

# 7. Sidebar

Características:

- oscuro;
- premium;
- contraíble;
- iconos Lucide;
- estado activo teal;
- hover suave;
- submenús discretos;
- tooltips en modo contraído.

Módulos iniciales:

- Inicio
- Territorios
- Programa
- Capitanes
- Casas
- Grupos
- Campañas
- Reportes / S-13
- Historial
- Configuración

En la parte inferior podrá existir **D-Assist** como módulo futuro.

---

# 8. Topbar

Puede incluir:

- búsqueda global;
- tenant/congregación activa;
- notificaciones;
- avatar;
- nombre;
- rol;
- menú de usuario;
- clima opcional si aporta valor.

No saturar.

---

# 9. Radios y sombras

## Radios

- pequeños: 10 px
- tarjetas: 14 px
- paneles: 18 px
- modales: 20 px

## Sombras

Muy suaves.

Usar elevación únicamente cuando ayude a separar capas.

---

# 10. Espaciado

Sistema recomendado:

4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 48 px

Toda pantalla debe respirar.

---

# 11. Iconografía

Librería principal:

**Lucide Icons**

Tamaños:

- navegación: 18–20 px;
- acciones: 16–18 px;
- destacados: 20–24 px.

No mezclar estilos de iconos.

---

# 12. Botones

## Primary

- teal sólido;
- texto blanco;
- acciones principales.

## Secondary

- blanco;
- borde suave;
- texto oscuro.

## Ghost

- transparente;
- acciones discretas.

## Destructive

- rojo;
- solo para acciones peligrosas.

Estados obligatorios:

- default;
- hover;
- active;
- disabled;
- loading.

---

# 13. Inputs y selects

Características:

- altura consistente;
- fondo blanco;
- borde claro;
- focus visible;
- placeholder suave;
- iconos solo cuando aporten.

---

# 14. Cards

Características:

- fondo blanco;
- borde tenue;
- radio 14 px;
- sombra sutil;
- jerarquía clara;
- acciones secundarias discretas.

---

# 15. Territorios — pantalla referencia

La pantalla Territorios es el estándar visual de todo el producto.

Debe incluir:

## Mapa

- gran área central;
- polígonos dinámicos;
- colores translúcidos;
- territorio seleccionado con realce fuerte;
- etiquetas claras;
- hover informativo.

## Panel contextual derecho

Debe mostrar:

- código;
- tipo;
- mini mapa tradicional;
- manzanas;
- casas aproximadas;
- estado;
- casa cercana;
- última actividad;
- CTA principal.

## Franja inferior

Tarjetas compactas de territorios con:

- código;
- miniatura;
- tipo;
- manzanas;
- casas;
- estado.

---

# 16. Programa

La interfaz administrativa del programa debe usar:

- calendario moderno;
- cards por salida;
- estados visuales;
- drag/drop solo si no complica accesibilidad;
- vista semanal y mensual;
- advertencias integradas.

El documento exportado para la congregación NO debe adoptar Spatial OS.

Debe conservar el formato tradicional conocido por los hermanos.

---

# 17. S-13

La pantalla interna del S-13 debe ser moderna y clara.

Debe permitir:

- seleccionar período;
- seleccionar estándar/gestión;
- ver campaña por color;
- vista previa;
- PDF;
- impresión.

El PDF debe preservar el formato funcional del S-13.

---

# 18. Motion

Permitido:

- fades;
- hover lift leve;
- sidebar transition;
- panel slide suave;
- cambio de polígonos;
- skeletons.

Evitar:

- bounce;
- animaciones lentas;
- efectos decorativos excesivos.

Duración preferida:

150–250 ms.

---

# 19. Accesibilidad

Requisitos:

- contraste suficiente;
- foco visible;
- no depender solo del color;
- texto legible;
- controles táctiles cómodos;
- navegación por teclado;
- tooltips complementarios, nunca esenciales.

---

# 20. Reglas para IA / Codex / Antigravity

1. No inventar una nueva dirección visual.
2. No reemplazar Spatial OS por un dashboard genérico.
3. Respetar tipografía, paleta, radios y espaciado.
4. Tomar Territorios como pantalla referencia.
5. Mantener consistencia entre todos los módulos.
6. Usar Lucide Icons.
7. No introducir nuevas librerías visuales sin necesidad.
8. No usar colores decorativos sin significado.
9. Priorizar claridad.
10. El programa compartido y S-13 exportado deben respetar sus formatos tradicionales.

---

# 21. Prompt base de implementación

> Implementa esta pantalla de D-TERRITORIO 4.0 siguiendo estrictamente UI-DESIGN-SYSTEM.md y tomando como referencia principal el mockup aprobado de Territorios / Spatial OS. No quiero un dashboard genérico. Mantén sidebar oscuro premium, topbar clara, Geist/Inter, verde/teal como identidad, paneles blancos, bordes suaves, mapas protagonistas, microinteracciones discretas y jerarquía clara. No alteres reglas funcionales documentadas en D-TERRITORIO-V4-SPEC.md y DATA-MODEL.md.
