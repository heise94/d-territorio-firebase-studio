# D-Territorio Campañas — Guía de Despliegue V1

## 1. Objetivo
Definir cómo preparar, probar y publicar el módulo Campañas sin mezclar datos de desarrollo con producción.

## 2. Dominio
Destino previsto:

`campanas.d-territorio.cl`

El módulo puede vivir dentro del mismo repositorio, pero debe poder servirse bajo este subdominio sin depender de rutas del sistema principal.

## 3. Entornos
Usar al menos:

### Desarrollo local
Para programación diaria, emuladores y seeds.

### Staging
Entorno previo a producción para pruebas funcionales y piloto.

### Producción
Datos reales de la campaña.

No reutilizar las mismas colecciones/proyecto de Firebase entre staging y producción salvo que exista una separación segura y explícita.

## 4. Firebase
La implementación debe documentar qué servicios usa finalmente, por ejemplo:
- Firestore;
- autenticación administrativa si corresponde;
- funciones/backend si se implementan;
- Firebase Cloud Messaging u otro mecanismo de push compatible;
- App Hosting/Hosting según la solución elegida.

El proyecto de producción debe tener reglas de seguridad revisadas antes de abrir inscripciones.

## 5. Variables de entorno
Nunca versionar secretos reales.

Mantener `.env.example` con nombres de variables y valores ficticios.

Categorías previsibles:
- configuración Firebase cliente;
- credenciales/secretos server-side;
- claves de push/VAPID si aplica;
- URL base pública;
- flags de entorno;
- parámetros de sesión;
- configuración de logging.

Las variables privadas nunca deben exponerse con prefijos destinados al cliente.

## 6. Autenticación y sesiones
Antes de producción validar:
- PIN hasheado;
- cookies/tokens seguros;
- HTTPS obligatorio;
- expiración y revocación;
- protección contra intentos repetidos;
- autorización server-side/reglas;
- sesión persistente probada en móviles reales.

## 7. PWA
Antes del despliegue final comprobar:
- `manifest` correcto;
- nombre e iconos definitivos;
- `start_url` apropiado para el subdominio;
- `display: standalone`;
- service worker actualizado;
- estrategia de caché que no mantenga datos personales obsoletos indefinidamente;
- actualización de versiones sin dejar usuarios atrapados en una build antigua.

## 8. Notificaciones push
Validar en staging antes de activar en producción:
- solicitud de permiso;
- suscripción por dispositivo;
- revocación;
- entrega Android;
- comportamiento iPhone/PWA según soporte real del navegador;
- fallback al centro de notificaciones interno.

No asumir que push siempre estará disponible.

## 9. DNS y subdominio
Crear el registro requerido para `campanas.d-territorio.cl` según el proveedor de hosting elegido.

Pasos generales:
1. obtener destino/verificación del proveedor;
2. crear registro DNS;
3. verificar dominio;
4. habilitar certificado TLS/HTTPS;
5. comprobar redirecciones y canonical host;
6. probar PWA desde el dominio final, ya que instalación y push pueden depender del origen.

No cambiar registros de correo u otros servicios del dominio que no estén relacionados con el subdominio Campañas.

## 10. Migraciones/cambios de modelo
Aunque Firestore sea flexible, cada cambio estructural debe:
- documentarse;
- ser compatible o incluir script de migración;
- probarse en staging;
- respaldar datos antes de transformaciones destructivas.

## 11. Datos iniciales de producción
Crear manualmente o mediante script seguro:
- campaña real;
- cuatro congregaciones participantes;
- fechas reales;
- bloques reales;
- usuarios organizadores;
- configuración inicial de capacidad.

No copiar participantes del seed demo.

## 12. Checklist previo a abrir inscripciones
- dominio funcionando con HTTPS;
- acceso administrador validado;
- campaña configurada;
- horarios revisados;
- congregaciones correctas;
- reglas Firestore desplegadas;
- teléfono+PIN probado;
- PWA probada en Android real;
- prueba en iPhone realizada cuando sea posible;
- notificaciones verificadas o fallback confirmado;
- textos e instrucciones revisados;
- backups/exportación configurados si aplica;
- monitoreo básico disponible.

## 13. Checklist previo a publicar programa
- conflictos críticos = 0;
- parejas obligatorias confirmadas validadas;
- duplicados = 0;
- cobertura revisada;
- puntos y horarios finales revisados;
- vista general revisada visualmente;
- PDF/impresión de prueba;
- notificaciones preparadas;
- responsable autoriza publicación.

## 14. Rollback
Mantener una forma simple de volver a la versión anterior del código.

Si un despliegue introduce un fallo:
- revertir build antes de modificar datos apresuradamente;
- no borrar asignaciones;
- mantener logs;
- comunicar a organizadores si una acción debe pausarse.

Para cambios de datos, preferir operaciones reversibles y auditables.

## 15. Backup y recuperación
Antes de campañas reales, definir un mecanismo práctico para exportar/respaldar datos relevantes.

Como mínimo proteger:
- participantes;
- disponibilidades;
- asignaciones;
- programa publicado;
- solicitudes de cambio.

El programa general publicado también debe poder exportarse a PDF como respaldo operativo.

## 16. Observabilidad mínima
Registrar de forma útil, evitando datos sensibles innecesarios:
- errores de backend;
- errores de publicación;
- fallos de notificación;
- acciones administrativas críticas;
- errores de autenticación agregados/seguros.

## 17. Lanzamiento recomendado
No abrir directamente a las cuatro congregaciones sin piloto.

Secuencia recomendada:
1. staging con datos demo;
2. prueba interna con organizadores;
3. piloto con un grupo pequeño de usuarios reales voluntarios;
4. corregir problemas de UX;
5. abrir inscripción general;
6. seguimiento durante primeras 24–48 horas de uso real.

## 18. Cierre de campaña
Después de finalizar:
- marcar campaña `completed`;
- conservar programa histórico;
- desactivar mutaciones ordinarias;
- exportar respaldo;
- revisar incidencias y registrar mejoras en `DECISIONS_LOG.md` o backlog.
