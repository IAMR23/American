export function notFoundHandler(request, response) {
  response.status(404).json({
    message: `Ruta no encontrada: ${request.method} ${request.originalUrl}`,
  });
}

export function errorHandler(error, _request, response, _next) {
  console.error(error);
  if (error.code === 11000) return response.status(409).json({ message: 'Ya existe un registro con esos datos.', fields: Object.keys(error.keyPattern ?? {}) });
  if (error.name === 'ValidationError' || error.name === 'CastError' || error instanceof SyntaxError) return response.status(400).json({ message: 'Los datos enviados no son válidos.', details: error.message });
  response.status(error.status ?? 500).json({ message: error.status ? error.message : 'Error interno del servidor.', details: error.status ? error.details : undefined });
}
