import Review from "../models/Review.js";
import Departament from "../models/Departament.js";

export async function crearComentario(req, res) {
  try {
    const { comentario, calificacion } = req.body;
    const { id } = req.params; // El ID del departamento es pasado como parámetro en la URL
    const arrendatarioId = req.user.id; // Suponemos que ya tienes el ID del arrendatario a través del middleware

    if (!id) {
      return res.status(400).json({ mensaje: "Falta el id en la URL" });
    }

    const departamento = await Departament.findById(id); // Buscamos el departamento
    if (!departamento) {
      return res.status(404).json({ mensaje: "Departamento no encontrado" });
    }

    // Creamos el nuevo comentario
    const nuevoComentario = new Review({
      departamento: id,
      arrendatario: arrendatarioId,
      comentario,
      calificacion,
    });

    // Guardamos el comentario
    await nuevoComentario.save();

    // Asociamos este comentario al departamento
    departamento.comentarios.push(nuevoComentario._id);
    await departamento.save();

    // Poblar la información del arrendatario (nombre y correo) en el comentario
    const comentarioConUsuario = await Review.findById(
      nuevoComentario._id
    ).populate("arrendatario", "nombre correo"); // Solo traemos los campos necesarios

    res.status(201).json({
      mensaje: "Comentario creado con éxito",
      comentario: comentarioConUsuario,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: "Error al crear el comentario", error });
  }
}
export async function obtenerDepartamentosConComentarios(req, res) {
  try {
    const { id } = req.params;

    const departamentos = await Departament.findById(id)
      .populate({
        path: "arrendador", // Poblar la información del arrendador
        select: "nombre email", // Puedes agregar más campos si lo deseas
      })
      .populate({
        path: "comentarios",
        populate: {
          path: "arrendatario",
          select: "nombre email", // Poblar la información del arrendatario en los comentarios
        },
      });

    if (!departamentos) {
      return res.status(404).json({ mensaje: "Departamento no encontrado" });
    }

    res.status(200).json(departamentos);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ mensaje: "Error al obtener los departamentos", error });
  }
}
