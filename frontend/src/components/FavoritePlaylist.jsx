import React, { useState } from "react";
import { FaEye, FaPlus, FaTrash } from "react-icons/fa";
import { BsMusicNote } from "react-icons/bs";
import { Link } from "react-router-dom";
import { useQueueContext } from "../hooks/QueueProvider";
import { API_URL } from "../config";
import axios from "axios";
import { useEffect } from "react";
import ToastModal from "./modal/ToastModal";

const FavoritePlaylist = ({ userId, onSelectAll }) => {
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(null);
  const { setNuevaCola } = useQueueContext();
  const [playlists, setPlaylists] = useState([]);
  const [toastMsg, setToastMsg] = useState("");

  const isValidArray = Array.isArray(playlists);

  const token = localStorage.getItem("token");

  const axiosConfig = {
    headers: { Authorization: `Bearer ${token}` },
  };

  useEffect(() => {
    fetchPlaylists();
  }, []);

  async function fetchPlaylists() {
    try {
      const resPlaylists = await axios.get(`${API_URL}/t/playlist/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPlaylists(Array.isArray(resPlaylists.data) ? resPlaylists.data : []);
    } catch (error) {
      console.error("Error al cargar playlists:", error);
    }
  }
  async function handleCrearPlaylist(e) {
    e.preventDefault();
    if (!newPlaylistName.trim()) return alert("Ingrese un nombre");

    try {
      await axios.post(
        `${API_URL}/t/playlist`,
        { nombre: newPlaylistName },
        axiosConfig
      );
      setNewPlaylistName("");
      fetchPlaylists();
    } catch (error) {
      console.log(error);
      console.error("Error al crear playlist:", error);
    }
  }

  async function handleEliminarPlaylist(e, playlistId) {
    e.stopPropagation(); // evita que se dispare el onClick de <li> o <Link>
    e.preventDefault(); // previene la navegación en caso de que esté dentro de <Link>

    // if (!window.confirm("¿Seguro que quieres eliminar esta playlist?")) return;

    try {
      await axios.delete(`${API_URL}/t/playlist/${playlistId}`, axiosConfig);
      // Actualizar lista sin recargar todo
      setPlaylists(playlists.filter((pl) => pl._id !== playlistId));

      setToastMsg("Playlist eliminada correctamente ✅")
      // setCanciones([]);
    } catch (error) {
      console.error("Error al eliminar playlist:", error);
      alert("No se pudo eliminar la playlist");
    }
  }

  return (
    <div
      className="bg-white p-4 rounded shadow-sm"
      style={{
        width: "100%",
        height: "80%", // ocupa todo el contenedor
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div className="d-flex align-items-center mb-3">
        <BsMusicNote size={24} className="me-2 text-primary" />
        <h3 className="mb-0">Listados de Favoritos</h3>
      </div>

      <form className="input-group mb-3" onSubmit={handleCrearPlaylist}>
        <input
          type="text"
          className="form-control"
          placeholder="Nombre"
          value={newPlaylistName}
          onChange={(e) => setNewPlaylistName(e.target.value)}
          autoFocus
        />
        <button
          className="btn btn-primary d-flex align-items-center justify-content-center"
          type="submit"
          title="Crear nuevo playlist"
        >
          <FaPlus />
        </button>
      </form>

      {!isValidArray || playlists.length === 0 ? (
        <p className="text-muted text-center flex-grow-1 d-flex align-items-center justify-content-center">
          No tienes playlists aún.
        </p>
      ) : (
        <ul
          className="list-group flex-grow-1"
          style={{ overflowY: "auto" }} // se adapta al espacio disponible
        >
          {playlists.map((playlist, i) => (
            <li
              key={i}
              className="list-group-item d-flex justify-content-between align-items-center"
              style={{
                backgroundColor: "white",
                color: selectedIndex === i ? "blue" : "black",
                transition: "all 0.3s ease",
              }}
            >
              <div
                className="d-flex align-items-center gap-2"
                style={{
                  cursor: "pointer",
                  fontSize: selectedIndex === i ? "1.2rem" : "1rem",
                  transform: selectedIndex === i ? "scale(1.05)" : "scale(1)",
                  transition: "all 0.2s ease-in-out",
                  fontWeight: selectedIndex === i ? "bold" : "normal",
                }}
                onClick={() => setSelectedIndex(i)}
              >
                <BsMusicNote style={{ color: "purple" }} />
                {playlist.nombre}
              </div>

              <div className="d-flex gap-2">
                <Link
                  to={`/mis-playlist/${playlist._id}`}
                  className="btn btn-outline-primary btn-sm"
                >
                  <FaEye size={24} />
                </Link>

                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => {
                    if (playlist.canciones) {
                      setNuevaCola(playlist.canciones, 0);
                      onSelectAll?.();
                    }
                  }}
                >
                  TODO
                </button>

                <button
                  className="btn btn-sm btn-danger "
                  onClick={(e) => handleEliminarPlaylist(e, playlist._id)}
                  title="Eliminar playlist"
                >
                  <FaTrash size={24} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ToastModal
        mensaje={toastMsg}
        onClose={() => setToastMsg("")}
        duracion={2000}
      />
    </div>
  );
};

export default FavoritePlaylist;
