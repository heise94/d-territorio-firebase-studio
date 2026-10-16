# Fase 11G — Rediseño UX/UI participante

## Alcance

F11G moderniza exclusivamente la experiencia participante de Campañas. Mantiene
la autenticación por sesión, CSRF, reglas privadas y la asignación manual de la
organización. No publica campañas, no modifica producción y no inicia F12.

## Sistema visual

La interfaz usa tokens semánticos para fondo cálido, superficies blancas, teal
principal, menta de confirmación, ámbar de atención y bordes discretos. Inter y
Lucide se mantienen. Las superficies tienen radios de 16–18 px y sombras suaves;
las tarjetas ya no son todas equivalentes.

## Exhibidor

`CampaignExhibitorIcon` es un símbolo vectorial original y neutral del exhibidor
móvil. Se reserva para identidad, retiro/devolución e información logística.
No contiene publicaciones, logos editoriales, cruces, iglesias ni símbolos
religiosos.

## Navegación y pantallas

La navegación inferior ya incluye Inicio, Disponibilidad, Mi programa, Avisos e
Información. Avisos obtiene un badge desde el contador interno de notificaciones.
El prompt PWA se limita a Inicio y persiste su descarte.

- Inicio prioriza solicitudes pendientes, próximo turno y campañas.
- Disponibilidad oculta métricas administrativas de cobertura y muestra el
  vínculo de compañero dentro del bloque seleccionado.
- Avisos separa recientes/no leídos de anteriores y mantiene push como opción.
- Mi programa muestra el programa vigente como itinerario, separa turnos
  anteriores y esconde metadata de versiones.
- Información está en `/campanas/informacion`; solo muestra secciones con datos.

## Información configurable

`Campaign.information` permite introducción, mapa general HTTPS, retiro,
devolución, contactos operativos y notas. Los puntos reutilizan nombre,
ubicación y descripción existentes y aceptan `mapUrl` HTTPS opcional. La lectura
participante deriva identidad de la sesión y únicamente devuelve campañas donde
la persona tiene inscripción activa. El administrador usa el editor existente.

## PairRequest por bloque

Las solicitudes nuevas incluyen `timeBlockId`. Los locks de relación y de
accepted se segmentan por campaña + bloque + inscripción: una persona puede
tener parejas distintas en horarios distintos, pero no dos accepted en el mismo
horario. Al aceptar, el servidor valida ambas inscripciones y agrega
transaccionalmente la disponibilidad del receptor si falta. La planificación
consulta la unidad accepted para el bloque correspondiente; no hay autoasignación
ni ranking. Solicitudes previas sin bloque se tratan como registros legacy.

## Validación y QA

`npm run typecheck` y `npm run build` pasan. La suite de PairRequest requiere
el emulador local explícito y no se ejecuta contra staging ni producción cuando
esa variable no está disponible. La revisión visual de staging debe comprobar
390 px como prioridad y 360/430 px antes de cualquier piloto humano.

## Fuera de alcance

No hay despliegue productivo, apertura real, F12, ranking, autoasignación,
mapas embebidos pesados ni cambios al planificador administrativo completo.
