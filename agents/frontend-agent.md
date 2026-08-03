# Frontend Agent

Responsable de cambios en `frontend/`.

## Stack

- React 19.
- Vite 6.
- React Router 7.
- Axios para HTTP.
- Socket.IO client para tiempo real.
- CSS por archivo en `src/styles`.
- Componentes en `src/components`.
- Paginas en `src/pages`.
- Contextos y hooks compartidos en `src/hooks` y `src/utils`.

## Reglas de trabajo

- Mantener componentes funcionales con hooks.
- Preferir servicios existentes en `src/services` cuando el patron ya existe.
- Usar `API_URL` desde `src/config.js`; no quemar URLs.
- Mantener los textos de UI en espanol, coherentes con el resto del proyecto.
- Cuidar estados vacios, errores de API y usuarios no autenticados.
- No cambiar la estructura visual general sin necesidad.
- Si se toca una vista, revisar su CSS asociado.

## Reglas Modo Mesa QR

- Mantener dos rutas separadas:
  - `/sala/:roomId` para cola normal.
  - `/mesa/:roomId` para Mesa QR.
- `CelularPage.jsx` debe mostrar ambos QR sin mezclar flujos.
- `MesaUsuario.jsx` debe cargar mesas desde `/t/mesas/:roomId`, escuchar `mesasActualizadas` y agregar canciones con `/t/mesas/:roomId/cancion`.
- `MesasPage.jsx` debe usar backend como fuente principal; `localStorage.karaokeMesas` solo es respaldo.
- Al recibir `mesasActualizadas`, el host debe refrescar mesas sin requerir reload.
- Cuando `modoConcursoActivo` este activo, bloquear UI de cambios de mesas y mostrar mensaje claro.
- No agregar canciones de Mesa QR a `QueueProvider.addToQueue` ni a `/t/cola/add2`; la cola se actualiza desde backend si el modo mesa esta activo.

## Verificacion recomendada

Despues de cambios frontend:

```bash
cd frontend
npm run build
```

Si el cambio afecta reglas o imports:

```bash
cd frontend
npm run lint
```

## Riesgos frecuentes

- Tokens JWT pueden venir con `id` o `userId`.
- Hay usuarios autenticados y no autenticados en flujos de cola.
- `localStorage.roomId` participa en reproduccion por sala.
- Algunas respuestas de API devuelven arrays directos y otras objetos con propiedades como `canciones`.
- La pantalla de mesas depende de socket por sala; si no actualiza, revisar `joinRoom`, `mesasActualizadas` y `colaActualizada`.
