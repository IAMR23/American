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
