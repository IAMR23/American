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
