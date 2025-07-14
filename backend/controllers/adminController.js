import Departament from "../models/Departament.js";
import User from "../models/User.js";

export async function aprobarDepartamento(req, res) {
  try {
    const { id } = req.params;
    const arrendador = await Departament.findByIdAndUpdate(
      id,
      { aprobado: true },
      { new: true }
    );

    if (!arrendador) {
      return res.status(404).json({ message: "departamento no encontrado" });
    }

    res.status(200).json({ message: "Departamento aprobado", arrendador });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ message: "Error al aprobar el departamento", error });
  }
}

export async function desaprobarDepartamento(req, res) {
  try {
    const { id } = req.params;
    const arrendador = await Departament.findByIdAndUpdate(
      id,
      { aprobado: false },
      { new: true }
    );

    if (!arrendador) {
      return res.status(404).json({ message: "departamento no encontrado" });
    }

    res.status(200).json({ message: "Departamento aprobado", arrendador });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ message: "Error al aprobar el departamento", error });
  }
}

export async function obtenerArrendadores(req, res) {
  try {
    const arrendadores = await User.find({
      rol: "arrendador",
    });
    res.status(200).json(arrendadores);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error al obtener los arrendadores", error });
    console.log(error);
  }
}

export async function aprobarArrendador(req, res) {
  try {
    const { id } = req.params;
    const arrendador = await User.findByIdAndUpdate(
      id,
      { verificado: true },
      { new: true }
    );

    if (!arrendador) {
      return res.status(404).json({ message: "Arrendador no encontrado" });
    }

    res.status(200).json({ message: "Arrendador aprobado", arrendador });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error al aprobar el arrendador", error });
  }
}

export async function desactivarArrendador(req, res) {
  try {
    const { id } = req.params;
    const arrendador = await User.findByIdAndUpdate(
      id,
      { verificado: false },
      { new: true }
    );

    if (!arrendador) {
      return res.status(404).json({ message: "Arrendador no encontrado" });
    }

    res.status(200).json({ message: "Arrendador desactivado", arrendador });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ message: "Error al desactivar el arrendador", error });
  }
}

export async function obtenerDepartamentosPorVerificar2(req, res) {
  try {
    const departamentos = await Departament.find({ aprobado: false });

    res.status(200).json(departamentos);
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Error al obtener los departamentos verificados",
      error,
    });
  }
}

export async function obtenerDepartamentosPorVerificar(req, res) {
  try {
    const departamentos = await Departament.find(); /* ({ aprobado: true }); */

    res.status(200).json(departamentos);
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Error al obtener los departamentos verificados",
      error,
    });
  }
}
