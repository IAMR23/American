const normalizeCancionId = (cancion) =>
  typeof cancion === "string" ? cancion : cancion?._id || cancion?.id;

function generarColaModoConcurso(participantes = [], cancionesPorParticipante) {
  const cantidad = Number(cancionesPorParticipante);
  const participantesValidos = (Array.isArray(participantes) ? participantes : [])
    .map((participante, participanteIndex) => ({
      ...participante,
      participanteIndex,
      canciones: Array.isArray(participante.canciones)
        ? participante.canciones
        : [],
    }))
    .filter((participante) => participante.nombre && participante.canciones.length);

  if (!Number.isFinite(cantidad) || cantidad <= 0) {
    throw new Error("Cantidad de canciones invalida");
  }

  const incompleto = participantesValidos.find(
    (participante) => participante.canciones.length !== cantidad,
  );

  if (incompleto) {
    throw new Error("Todos los participantes deben tener la misma cantidad de canciones");
  }

  const cola = [];

  for (let cancionIndex = 0; cancionIndex < cantidad; cancionIndex++) {
    for (const participante of participantesValidos) {
      const cancion = participante.canciones[cancionIndex];
      const cancionId = normalizeCancionId(cancion);

      if (cancionId) {
        cola.push({
          participanteId:
            participante.id ||
            participante._id ||
            `participante-${participante.participanteIndex}`,
          participanteNombre: participante.nombre,
          participanteIndex: participante.participanteIndex,
          cancionIndex,
          cancionId,
          estado: "pendiente",
        });
      }
    }
  }

  if (cola[0]) {
    cola[0].estado = "reproduciendo";
  }

  return cola;
}

module.exports = {
  generarColaModoConcurso,
};
