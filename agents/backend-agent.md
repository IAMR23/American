# Backend Agent

Responsable de cambios en `backend/`.

## Stack

- Node.js con Express.
- MongoDB con Mongoose.
- Socket.IO.
- JWT.
- Multer para uploads.
- PayPal, correo y variables de entorno desde `.env`.

## Estructura

- `index.js`: arranque, CORS, middlewares, rutas y Socket.IO.
- `routes/`: define endpoints y delega a controladores.
- `controllers/`: logica de negocio por recurso.
- `models/`: esquemas de Mongoose.
- `middleware/`: autenticacion, cookies, reset password y uploads.
- `services/`: logica compartida para modos de sala/concurso.
- `sockets/`: eventos de tiempo real.

## Reglas de trabajo

- No modificar secretos ni credenciales.
- Mantener nombres de rutas existentes si hay frontend consumiendolas.
- Validar IDs y entradas antes de consultar MongoDB.
- Devolver errores con status HTTP coherentes.
- Evitar mezclar logica de controlador dentro de rutas nuevas.
- Si una ruta impacta cola, sala o reproduccion, revisar tambien sockets y frontend.

## Reglas Modo Mesa QR

- Las mesas persistentes viven en `models/MesaSala.js`, indexadas por `roomId`.
- Antes de mutar mesas, validar que la sala exista en `Room`.
- No crear mesas sin `nombre`, personas sin `nombre` ni canciones sin `songId`.
- Evitar canciones duplicadas dentro de la misma persona.
- Todas las mutaciones de `/t/mesas/:roomId/...` deben emitir `mesasActualizadas` a `io.to(roomId)`.
- Si la cola de esa sala tiene `modoMesaActivo: true`, despues de mutar mesas hay que regenerar `Cola.canciones` y `Cola.modoMesaItems` con `generarColaModoMesa`, conservar un `currentIndex` seguro y emitir `colaActualizada`.
- Si ya no quedan canciones reales de mesas/personas, desactivar modo mesa y restaurar `colaNormalBackup`.
- Si `modoConcursoActivo` esta activo, bloquear mutaciones de mesas con `409` y mensaje claro.
- No usar `/t/cola/add2` para canciones de mesas; ese endpoint pertenece a cola normal.

## Verificacion recomendada

```bash
cd backend
npm test
```

Si no hay pruebas para el area tocada, levantar el backend y probar la ruta afectada:

```bash
cd backend
npm run dev
```

## Riesgos frecuentes

- CORS tiene dominios de produccion y desarrollo; tocarlo puede romper despliegue.
- Mongo corre con auth en Docker.
- Los uploads se sirven desde `/uploads`.
- Hay rutas con prefijos cortos (`/t`, `/t2`, `/p`) que el frontend ya puede depender.
- Cambios de mesas pueden impactar dos sockets: `mesasActualizadas` y `colaActualizada`.
