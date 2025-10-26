import React, { useState } from "react";
import { FaPlus } from "react-icons/fa";
import { BsMusicNote } from "react-icons/bs";
import { Link } from "react-router-dom";
import { useQueueContext } from "../hooks/QueueProvider";

const FavoritePlaylist = ({ playlists , onSelectAll}) => {
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(null);
  const { setNuevaCola } = useQueueContext();

  const isValidArray = Array.isArray(playlists);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (newPlaylistName.trim()) {
      onAdd(newPlaylistName.trim());
      setNewPlaylistName("");
    }
  };

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

      <form className="input-group mb-3" onSubmit={handleSubmit}>
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
                  Ver
                </Link>

                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => {
                    if (playlist.canciones) {
                      setNuevaCola(playlist.canciones, 0);
                      onSelectAll?.()
                    }
                  }}
                >
                  Todo
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default FavoritePlaylist;
