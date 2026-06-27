import React, { useEffect, useState } from "react";
import axios from "axios";
import { API_URL } from "../config";
import { getToken, getUserId } from "../utils/auth";
import { Link } from "react-router-dom";
import { FaTrash } from "react-icons/fa";
import ToastModal from "../components/modal/ToastModal";
import PaginationControls from "../components/PaginationControls";
import { confirmAction } from "../utils/swalAlerts";

const PAGE_LIMIT = 20;

export default function PlaylistPropiaCRUD() {
  const [playlists, setPlaylists] = useState([]);
  const [nombreNueva, setNombreNueva] = useState("");
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [canciones, setCanciones] = useState([]);
  const [songIdToAdd, setSongIdToAdd] = useState("");
  const [toastMsg, setToastMsg] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const token = getToken();

  const axiosConfig = {
    headers: { Authorization: `Bearer ${token}` },
  };

  useEffect(() => {
    fetchPlaylists();
  }, [page]);

  async function fetchPlaylists() {
    try {
      const res = await axios.get(`${API_URL}/t2/playlistpropia`, {
        ...axiosConfig,
        params: { page, limit: PAGE_LIMIT },
      });
      setPlaylists(res.data.playlists || []);
      setTotal(res.data.total || 0);
      setTotalPages(res.data.totalPages || 1);
    } catch (error) {
      console.error("Error al cargar playlists:", error);
    }
  }

  async function fetchCanciones(playlistId) {
    try {
      const res = await axios.get(
        `${API_URL}/t2/playlistpropia/canciones/${playlistId}`,
        axiosConfig
      );
      setCanciones(res.data.canciones);
      setSelectedPlaylist(playlistId);
    } catch (error) {
      console.error("Error al cargar canciones:", error);
    }
  }

  async function handleCrearPlaylist(e) {
    e.preventDefault();
    if (!nombreNueva.trim()) return setToastMsg("Ingrese un nombre");

    try {
      await axios.post(
        `${API_URL}/t2/playlistpropia`,
        { nombre: nombreNueva },
        axiosConfig
      );
      setNombreNueva("");
      fetchPlaylists();
    } catch (error) {
      console.error("Error al crear playlist:", error);
      setToastMsg(error.response?.data?.error || "Error al crear playlist");
    }
  }

  async function handleEliminarPlaylist(e, playlistId) {
    e.stopPropagation(); // evita que se dispare el onClick de <li> o <Link>
    e.preventDefault(); // previene la navegación en caso de que esté dentro de <Link>

    const confirmed = await confirmAction({
      title: "Eliminar playlist",
      text: "Seguro que quieres eliminar esta playlist?",
      confirmButtonText: "Si, eliminar",
    });
    if (!confirmed) return;

    try {
      await axios.delete(
        `${API_URL}/t2/playlistpropia/${playlistId}`,
        axiosConfig
      );
      // Actualizar lista sin recargar todo
      setPlaylists(playlists.filter((pl) => pl._id !== playlistId));

      // Si la playlist eliminada estaba seleccionada, limpia selección
      if (selectedPlaylist === playlistId) {
        setSelectedPlaylist(null);
        setCanciones([]);
      }
      setToastMsg("Playlist eliminada correctamente ✅");
    } catch (error) {
      console.error("Error al eliminar playlist:", error);
      setToastMsg("No se pudo eliminar la playlist");
    }
  }

  return (
    <div className="">
      <h2>Playlists sugeridos</h2>

      <form onSubmit={handleCrearPlaylist} className="mb-3">
        <div className="input-group">
          <input
            type="text"
            className="form-control"
            placeholder="Nombre nueva playlist"
            value={nombreNueva}
            onChange={(e) => setNombreNueva(e.target.value)}
          />
          <button className="btn btn-primary" type="submit">
            Crear
          </button>
        </div>
      </form>

      <ul className="list-group mb-4">
        {playlists.map((pl) => (
          <li
            key={pl._id}
            className={`list-group-item d-flex justify-content-between align-items-center ${
              selectedPlaylist === pl._id ? "active" : ""
            }`}
            style={{ cursor: "pointer" }}
            onClick={() => fetchCanciones(pl._id)}
          >
            <Link
              to={`/playlist/${pl._id}`}
              onClick={(e) => e.stopPropagation()} // para que no dispare el onClick del li
            >
              <span className="badge bg-secondary rounded-pill ms-2">
                {pl.nombre} / {pl.cancionesCount ?? pl.canciones?.length ?? 0} canciones
              </span>
            </Link>

            <button
              className="btn btn-sm btn-danger ms-3"
              onClick={(e) => handleEliminarPlaylist(e, pl._id)}
              title="Eliminar playlist"
            >
              <FaTrash size={24} />
            </button>
          </li>
        ))}
      </ul>

      <PaginationControls
        page={page}
        total={total}
        totalPages={totalPages}
        onPageChange={setPage}
      />

      <ToastModal
        mensaje={toastMsg}
        onClose={() => setToastMsg("")}
        duracion={2000}
      />
    </div>
  );
}

