# Autonomy Checklist

Usar esta lista antes de cerrar una tarea.

## Antes de editar

- Entendi el pedido del usuario.
- Revise el archivo activo o el modulo relacionado.
- Busque patrones cercanos antes de inventar uno nuevo.
- Identifique si el cambio toca frontend, backend o ambos.
- Si toca mesas, confirme si afecta Mesa QR, cola normal, modo mesa activo o concurso.

## Durante la edicion

- El cambio es pequeno y enfocado.
- No toque secretos ni archivos no relacionados.
- Respete nombres, rutas y estilos existentes.
- Agregue manejo de error si el flujo podia romperse.
- Evite dependencias nuevas salvo necesidad confirmada.
- Si muta mesas en backend, mantuve `MesaSala`, `mesasActualizadas` y la sincronizacion de cola cuando `modoMesaActivo` esta activo.
- Si toca frontend de mesas, no use `localStorage` como fuente principal ni mezcle `/mesa/:roomId` con `/sala/:roomId`.

## Despues de editar

- Ejecute la verificacion mas cercana.
- Si no pude verificar, deje claro por que.
- Revise `git status --short`.
- Explique archivos tocados y resultado.
- En flujos realtime, verifique o describi como validar que socket actualiza host y celular.

## Criterio de salida

Una tarea esta lista cuando:

- el comportamiento pedido esta implementado;
- no hay errores obvios de build o sintaxis;
- el usuario sabe que se cambio;
- queda claro que validacion se hizo.
