import { useEffect, useState } from "react";
import axios from "axios";
import { API_URL } from "../config";
import { FiSave } from "react-icons/fi";


const UsuariosPage = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [filtroSuscripcion, setFiltroSuscripcion] = useState("todos");

  useEffect(() => {
    fetchUsuarios();
  }, []);

  const fetchUsuarios = async () => {
    try {
      const res = await axios.get(`${API_URL}/users`);
      const usuariosConEdicion = res.data.user.map((u) => ({
        ...u,
        editSuscrito: u.suscrito,
        editStart: u.subscriptionStart ? u.subscriptionStart.slice(0, 10) : "",
        editEnd: u.subscriptionEnd ? u.subscriptionEnd.slice(0, 10) : "",
      }));
      setUsuarios(usuariosConEdicion);
    } catch (err) {
      console.error("Error al obtener usuarios:", err);
    }
  };

  const handleInputChange = (id, field, value) => {
    setUsuarios((prev) =>
      prev.map((u) => (u._id === id ? { ...u, [field]: value } : u))
    );
  };

  const handleUpdateUser = async (user) => {
    try {
      await axios.patch(`${API_URL}/users/${user._id}`, {
        suscrito: user.editSuscrito,
        subscriptionStart: user.editStart,
        subscriptionEnd: user.editEnd,
      });
      alert("Usuario actualizado");
      fetchUsuarios();
    } catch (err) {
      console.error("Error actualizando usuario:", err);
      alert("Error al actualizar");
    }
  };

  const usuariosFiltrados = usuarios.filter((usuario) => {
    if (filtroSuscripcion === "todos") return true;
    if (filtroSuscripcion === "suscritos") return usuario.suscrito === true;
    if (filtroSuscripcion === "noSuscritos") return usuario.suscrito === false;
    return true;
  });

  // Obtener la fecha de hoy en formato yyyy-mm-dd
  const hoy = new Date().toISOString().split("T")[0];

  return (
    <div className="">
      <h2 className="font-bold mb-4">Lista de Usuarios</h2>

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
            <th className="py-2 px-4 border">Inicio</th>
            <th className="py-2 px-4 border">Fin</th>
            <th className="py-2 px-4 border">Acción</th>
          </tr>
        </thead>
        <tbody>
          {usuariosFiltrados.map((user) => (
            <tr key={user._id} className="text-center">
              <td className="py-2 px-4 border">{user.nombre}</td>
              <td className="py-2 px-4 border">{user.email}</td>
              <td className="py-2 px-4 border">{user.rol}</td>
              <td className="py-2 px-4 border">
                <input
                  type="checkbox"
                  checked={user.editSuscrito}
                  onChange={(e) =>
                    handleInputChange(user._id, "editSuscrito", e.target.checked)
                  }
                />
              </td>
              <td className="py-2 px-4 border">
                <input
                  type="date"
                  min={hoy}
                  value={user.editStart}
                  onChange={(e) =>
                    handleInputChange(user._id, "editStart", e.target.value)
                  }
                  className="border rounded px-2"
                />
              </td>
              <td className="py-2 px-4 border">
                <input
                  type="date"
                  min={hoy}
                  value={user.editEnd}
                  onChange={(e) =>
                    handleInputChange(user._id, "editEnd", e.target.value)
                  }
                  className="border rounded px-2"
                />
              </td>
              <td className="py-2 px-4 border">
                <button
                  onClick={() => handleUpdateUser(user)}
                  className="bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                >
                  <FiSave/>
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default UsuariosPage;
