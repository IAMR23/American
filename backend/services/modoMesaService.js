const getMesaNumero = (mesa, index) => {
  if (Number.isFinite(Number(mesa?.numero))) return Number(mesa.numero);

  const match = String(mesa?.nombre || "").match(/\d+/);
  if (match) return Number(match[0]);

  return index + 1;
};

const normalizeCancionId = (cancion) =>
  typeof cancion === "string" ? cancion : cancion?._id || cancion?.id;

function generarColaModoMesa(mesas = []) {
  const mesasOrdenadas = (Array.isArray(mesas) ? mesas : [])
    .map((mesa, index) => ({
      ...mesa,
      numero: getMesaNumero(mesa, index),
      participantes: mesa.participantes || mesa.personas || [],
    }))
    .sort((a, b) => a.numero - b.numero);

  const maxParticipantes = mesasOrdenadas.reduce(
    (max, mesa) => Math.max(max, mesa.participantes?.length || 0),
    0,
  );

  const maxCanciones = mesasOrdenadas.reduce((max, mesa) => {
    const maxMesa = (mesa.participantes || []).reduce(
      (personaMax, participante) =>
        Math.max(personaMax, participante.canciones?.length || 0),
      0,
    );

    return Math.max(max, maxMesa);
  }, 0);

  const cola = [];

  for (let cancionIndex = 0; cancionIndex < maxCanciones; cancionIndex++) {
    for (
      let participanteIndex = 0;
      participanteIndex < maxParticipantes;
      participanteIndex++
    ) {
      for (const mesa of mesasOrdenadas) {
        const participante = mesa.participantes?.[participanteIndex];
        const cancion = participante?.canciones?.[cancionIndex];
        const cancionId = normalizeCancionId(cancion);

        if (participante && cancionId) {
          cola.push({
            mesaNumero: mesa.numero,
            mesaNombre: mesa.nombre || `Mesa ${mesa.numero}`,
            participanteNombre: participante.nombre,
            participanteIndex,
            cancionIndex,
            cancionId,
          });
        }
      }
    }
  }

  return cola;
}

module.exports = {
  generarColaModoMesa,
};
