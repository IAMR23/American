# Agents

Carpeta de trabajo para agentes autonomos del proyecto American Karaoke.

Este proyecto tiene dos superficies principales:

- `frontend/`: React 19 + Vite, estilos CSS locales, rutas con `react-router-dom`, estado compartido en `src/hooks` y utilidades en `src/utils`.
- `backend/`: Express + MongoDB/Mongoose, rutas en `routes`, controladores en `controllers`, modelos en `models` y tiempo real con Socket.IO.

## Autonomia permitida

Un agente puede avanzar sin pedir permiso cuando la tarea sea clara y el cambio sea acotado:

- corregir bugs evidentes;
- mejorar componentes existentes manteniendo el estilo actual;
- ordenar imports o eliminar codigo muerto dentro del archivo tocado;
- agregar validaciones defensivas;
- crear documentacion operativa;
- ejecutar verificaciones locales disponibles.

Debe pedir confirmacion antes de:

- cambiar contratos de API;
- renombrar rutas publicas;
- modificar `.env`, secretos, dominios, CORS de produccion o credenciales;
- borrar datos, migraciones o archivos subidos;
- hacer cambios visuales grandes sin una referencia clara;
- introducir dependencias nuevas.

## Flujo base

1. Leer el archivo o modulo pedido por el usuario.
2. Revisar archivos vecinos para entender patrones.
3. Hacer el cambio mas pequeno que resuelva el problema.
4. Validar con el comando mas cercano al area modificada.
5. Reportar que cambio, donde y que verificacion se hizo.

## Comandos utiles

Frontend:

```bash
cd frontend
npm run build
npm run lint
npm run dev
```

Backend:

```bash
cd backend
npm test
npm run dev
npm start
```

Docker:

```bash
docker compose up --build
```

## Notas del proyecto

- La URL del backend en frontend sale de `VITE_API_URL` mediante `frontend/src/config.js`.
- La autenticacion usa JWT guardado por utilidades de `frontend/src/utils/auth.js`.
- El reproductor y la cola viven principalmente en providers dentro de `frontend/src/hooks`.
- El backend monta rutas por prefijos como `/song`, `/genero`, `/t`, `/t2`, `/pdf`, `/sesion` y `/room`.
- Socket.IO se inicializa desde `backend/sockets/socket.js`.
