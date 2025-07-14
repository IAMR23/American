import { useEffect, useState } from "react";
import axios from "axios";
import { API_URL } from "../config"

const UsuariosPage = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [filtroSuscripcion, setFiltroSuscripcion] = useState("todos");

  useEffect(() => {
    fetchUsuarios();
  }, []);

  const fetchUsuarios = async () => {
    try {
      const res = await axios.get(`${API_URL}/users`);
      setUsuarios(res.data.user);
    } catch (err) {
      console.error("Error al obtener usuarios:", err);
    }
  };

  const usuariosFiltrados = usuarios.filter((usuario) => {
    if (filtroSuscripcion === "todos") return true;
    if (filtroSuscripcion === "suscritos") return usuario.suscrito === true;
    if (filtroSuscripcion === "noSuscritos") return usuario.suscrito === false;
    return true;
  });

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Lista de Usuarios</h2>

      <div className="mb-4">
        <label className="mr-2 font-medium">Filtrar por suscripción:</label>
        <select
          value={filtroSuscripcion}
          onChange={(e) => setFiltroSuscripcion(e.target.value)}
          className="border p-2 rounded"
        >
          <option value="todos">Todos</option>
          <option value="suscritos">Suscritos</option>
          <option value="noSuscritos">No Suscritos</option>
        </select>
      </div>

      <table className="min-w-full bg-white border">
        <thead>
          <tr className="bg-gray-100">
            <th className="py-2 px-4 border">Nombre</th>
            <th className="py-2 px-4 border">Email</th>
            <th className="py-2 px-4 border">Rol</th>
            <th className="py-2 px-4 border">¿Suscrito?</th>
          </tr>
        </thead>
        <tbody>
          {usuariosFiltrados.map((user) => (
            <tr key={user._id} className="text-center">
              <td className="py-2 px-4 border">{user.nombre}</td>
              <td className="py-2 px-4 border">{user.email}</td>
              <td className="py-2 px-4 border">{user.rol}</td>
              <td className="py-2 px-4 border">
                {user.suscrito ? "Sí" : "No"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default UsuariosPage;
