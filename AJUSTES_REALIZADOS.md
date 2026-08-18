# Bitacora de ajustes realizados

Este archivo queda como evidencia tecnica de los cambios aplicados durante el trabajo en el proyecto American Karaoke.

## 2026-08-16

### Seguridad de usuarios y autenticacion

- Se endurecio el modelo de usuario para ocultar campos sensibles por defecto, como contrasena, tokens de recuperacion, version de token y datos internos de suscripcion PayPal.
- Se agregaron utilidades de normalizacion y validacion para email, nombre y contrasena.
- El registro publico ya no acepta roles ni estados de suscripcion enviados por el cliente.
- Las rutas de listado, edicion y eliminacion de usuarios quedaron protegidas para administradores.
- Se agrego rate limit en registro, login, recuperacion y reseteo de contrasena.
- Las respuestas de usuario se serializan sin exponer datos sensibles.

### Cierre de sesion e historial del navegador

- Se corrigio el problema donde, despues de cerrar sesion, el usuario podia volver con el boton atras del navegador y ver la interfaz como si siguiera ingresado.
- El token de acceso en memoria ahora se invalida contra un marcador persistente `americanKaraokeLogoutAt`.
- `App`, `Home` y `AuthContext` sincronizan la sesion al volver desde historial, recuperar foco, cambiar visibilidad o recibir cambios de storage.
- Si existe marcador de logout, la app ya no rehidrata automaticamente la sesion con `/api/auth/refresh`.
- El cierre de sesion de `Home` ahora limpia sala, propietario de sala, modos locales, fullscreen pendiente, cola, socket y reemplaza la ruta actual hacia la vista de ingreso.
- `Navbar` dejo de usar `localStorage.clear()` como cierre de sesion y ahora limpia el token en memoria mediante `removeToken`.
- Los fallos automaticos de refresh limpian el token en memoria sin crear un marcador de logout explicito.
- El backend de `/api/auth/logout` incrementa `tokenVersion` cuando recibe un Bearer token valido, invalidando access tokens viejos restaurados desde historial o memoria.

### PayPal y suscripciones

- Se agrego validacion server-side de suscripciones contra PayPal antes de activar acceso local.
- La activacion de suscripcion usa el usuario autenticado desde el token y ya no confia en `userId` enviado por el frontend.
- Se agrego verificacion oficial de webhooks PayPal mediante `PAYPAL_WEBHOOK_ID`.
- Se agrego registro idempotente de eventos webhook para evitar reprocesos.
- Las rutas administrativas de productos y planes PayPal quedaron protegidas con autenticacion y rol admin.
- Los endpoints publicos de productos y planes exponen solo informacion activa y segura.

### Roles, permisos y recursos del usuario

- Las operaciones de crear, editar y eliminar canciones, generos, publicaciones, puntajes y PDFs quedaron restringidas a administradores donde corresponde.
- Las solicitudes de canciones usan el usuario autenticado desde el token.
- Los votos de solicitudes se manejan de forma atomica para evitar votos duplicados por carrera.
- Playlists, favoritos y playlists propias ahora validan propietario o administrador antes de modificar.
- Se agregaron indices unicos para reducir duplicados en playlists, favoritos y playlists propias.

### Salas, mesas y cola

- Las acciones destructivas o de control de sala ahora requieren que el usuario autenticado sea host de la sala y tenga acceso activo.
- Se protegieron acciones como crear o borrar mesas/personas, activar modos, calificar, eliminar participantes, agregar a cola, reproducir ahora y remover canciones.
- Se conservaron rutas publicas o de invitado necesarias para flujos QR y mesas, sin abrir permisos de control del host.

### Rutas frontend y QR

- Se agrego la ruta `/mesa/:roomId` para acceder correctamente a la vista de mesa.
- Se agrego la ruta `/listado-pdf/cancion` para el listado PDF por cancion.
- Se agrego prueba estatica para validar que esas rutas existan en `frontend/src/App.jsx`.

### Carruseles para usuarios ingresados sin suscripcion

- Los carruseles `Recomendados` y `Las mas populares` quedaron disponibles para usuarios autenticados aunque no tengan suscripcion.
- Los botones de mover carrusel, agregar a cola y reproducir ahora ya no dependen de la suscripcion en esos componentes.
- Si el usuario no tiene sala activa por no estar suscrito, se usa una cola local en el frontend.
- La cola local permite hasta 6 canciones.
- Al intentar agregar una septima cancion, se muestra el mensaje `La cola permite hasta 6 canciones`.
- El boton de reproducir ahora sigue funcionando con la cola llena: pone la cancion al frente y mantiene el limite de 6.
- En estos carruseles ya no se envia `userId` al endpoint de cola; el backend obtiene el usuario desde el token.

### Pruebas y verificacion

- Se agregaron pruebas para seguridad de usuarios, PayPal, autorizacion, control de salas y rutas frontend.
- Se ejecuto `npm test` en `backend` con resultado exitoso: 5 suites y 22 tests pasados.
- Se ejecuto `npm run build` en `frontend` con resultado exitoso despues de los ajustes de carruseles y cierre de sesion.
- El build mantiene avisos existentes sobre `Mboton*.png` no resueltos en tiempo de build y un chunk grande de Vite.

### Archivos principales modificados

- `backend/controllers/authController.js`
- `backend/controllers/listController.js`
- `backend/controllers/listControllerPropia.js`
- `backend/controllers/solicitudCancionController.js`
- `backend/controllers/userController.js`
- `backend/middleware/authMiddleware.js`
- `backend/middleware/rateLimit.js`
- `backend/models/Favorito.js`
- `backend/models/Pago.js`
- `backend/models/PaypalWebhookEvent.js`
- `backend/models/Plan.js`
- `backend/models/Playlist.js`
- `backend/models/PlaylistPropia.js`
- `backend/models/User.js`
- `backend/routes/TotalRoutes.js`
- `backend/routes/UserRoutes.js`
- `backend/routes/authRoutes.js`
- `backend/routes/cancionRoutes.js`
- `backend/routes/generoRoutes.js`
- `backend/routes/paypalRoutes.js`
- `backend/routes/pdf.routes.js`
- `backend/routes/publicacionRoutes.js`
- `backend/routes/solicitudCancionRoutes.js`
- `backend/routes/suscripcionRoutes.js`
- `backend/services/paypalSubscriptionService.js`
- `backend/utils/userSecurity.js`
- `frontend/src/App.jsx`
- `frontend/src/components/Navbar.jsx`
- `frontend/src/components/CrearPlanModal.jsx`
- `frontend/src/components/PaypalSuscripcion.jsx`
- `frontend/src/components/Productos.jsx`
- `frontend/src/components/VideoCarousel.jsx`
- `frontend/src/components/VideoCarouselVisibles.jsx`
- `frontend/src/pages/Home.jsx`
- `frontend/src/services/axiosConfig.js`
- `frontend/src/utils/AuthContext.jsx`
- `frontend/src/utils/auth.js`
