import React, { useState, useEffect } from "react";
import axios from "axios";
import { getToken } from "../utils/auth";
import { API_URL } from "../config";
import { FaPlus } from "react-icons/fa";
import ToastModal from "./modal/ToastModal";

export default function PlaylistSelectorModal({
  userId,
  songId,
  show,
  onClose,
  onAddToPlaylistSuccess,
}) {
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState(null);
  const [adding, setAdding] = useState(false);
  const [toast, setToast] = useState(null);
  const [newPlaylistName, setNewPlaylistName] = useState("");

  useEffect(() => {
    if (!show) return;

    const fetchPlaylists = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = getToken();
        const res = await axios.get(`${API_URL}/t/playlist/${userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setPlaylists(res.data || []);
      } catch (err) {
        setError("Error cargando playlists");
      } finally {
        setLoading(false);
      }
    };

    fetchPlaylists();
  }, [show, userId]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (newPlaylistName.trim()) {
      onAdd(newPlaylistName.trim());
      setNewPlaylistName("");
    }
  };

  const onAdd = async (name) => {
    const token = getToken();
    try {
      const res = await axios.post(
        `${API_URL}/t/playlist`,
        { nombre: name },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const nuevaPlaylist = res.data;
      setPlaylists((prev) =>
        Array.isArray(prev) ? [...prev, nuevaPlaylist] : [nuevaPlaylist]
      );

      setToast("✅ Playlist creado correctamente");
    } catch (err) {
      console.error("Error al crear playlist:", err.response?.data || err.message);
      setToast("⚠️ No se pudo crear el playlist. Quizás ya existe.");
    }
  };

  const handleAddToPlaylist = async () => {
    if (!selectedPlaylistId) {
      setToast("⚠️ Selecciona una playlist primero");
      return;
    }

    setAdding(true);
    try {
      const token = getToken();
      await axios.post(
        `${API_URL}/t/playlist/${selectedPlaylistId}/addSong/`,
        { songId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setToast("🎵 Canción agregada correctamente");
      onAddToPlaylistSuccess && onAddToPlaylistSuccess();

      // 🔥 Cerrar modal después de mostrar el toast
      setTimeout(() => {
        setToast(null);
        onClose();
      }, 1500);
    } catch (err) {
      console.error(err);
      setToast("❌ Error al agregar la canción");
    } finally {
      setAdding(false);
    }
  };

  if (!show) return null;

  return (
    <>
      {/* Fondo oscuro */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          backgroundColor: "rgba(0,0,0,0.6)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 9999,
        }}
      >
        {/* Modal */}
        <div
          style={{
            backgroundColor: "#fff",
            padding: "25px",
            borderRadius: "12px",
            maxWidth: "400px",
            width: "90%",
            boxShadow: "0 4px 15px rgba(0,0,0,0.3)",
            position: "relative",
          }}
        >
          {/* Botón de cierre (X) */}
          <button
            onClick={onClose}
            style={{
              position: "absolute",
              top: "10px",
              right: "10px",
              border: "none",
              background: "transparent",
              fontSize: "22px",
              cursor: "pointer",
              color: "#555",
              transition: "0.3s",
            }}
            onMouseEnter={(e) => (e.target.style.color = "red")}
            onMouseLeave={(e) => (e.target.style.color = "#555")}
          >
            ✖
          </button>

          <h3 style={{ textAlign: "center", marginBottom: "15px" }}>
            Selecciona un playlist
          </h3>

          {/* Crear nuevo playlist */}
          <form className="input-group mb-3" onSubmit={handleSubmit}>
            <input
              type="text"
              className="form-control"
              placeholder="Nombre del nuevo playlist"
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              aria-label="Nuevo playlist"
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

          {/* Listado */}
          {loading && <p>Cargando playlists...</p>}
          {error && <p style={{ color: "red" }}>{error}</p>}
          {!loading && playlists.length === 0 && <p>No tienes playlists.</p>}

          <ul
            style={{
              listStyle: "none",
              padding: 0,
              maxHeight: "250px",
              overflowY: "auto",
              marginBottom: "15px",
            }}
          >
            {playlists.map((playlist) => (
              <li key={playlist._id} style={{ marginBottom: "8px" }}>
                <label style={{ cursor: "pointer", userSelect: "none" }}>
                  <input
                    type="radio"
                    name="playlist"
                    value={playlist._id}
                    checked={selectedPlaylistId === playlist._id}
                    onChange={() => setSelectedPlaylistId(playlist._id)}
                    style={{ marginRight: "8px" }}
                  />
                  🎵 {playlist.nombre}
                </label>
              </li>
            ))}
          </ul>

          {/* Botón guardar */}
          <button
            disabled={adding}
            onClick={handleAddToPlaylist}
            style={{
              padding: "10px 20px",
              backgroundColor: adding ? "#ccc" : "#007bff",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: adding ? "not-allowed" : "pointer",
              width: "100%",
              fontSize: "16px",
            }}
          >
            {adding ? "Guardando..." : "Guardar en playlist"}
          </button>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <ToastModal
          mensaje={toast}
          duracion={2000}
          onClose={() => setToast(null)}
        />
      )}
    </>
  );
}
