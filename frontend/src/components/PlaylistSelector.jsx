import React, { useState } from "react";
import { FaPlus } from "react-icons/fa";
import { BsMusicNote } from "react-icons/bs";
import { Link } from "react-router-dom";

const PlaylistSelector = ({ playlists, onSelect, onAdd, onClose }) => {
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(null); // estado para el seleccionado

  const isValidArray = Array.isArray(playlists);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (newPlaylistName.trim()) {
      onAdd(newPlaylistName.trim());
      setNewPlaylistName("");
    }
  };

  return (
    <div className="bg-white p-4 rounded shadow-sm w-100" style={{ maxWidth: "100%" }}>
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
        <p className="text-muted text-center">No tienes playlists aún.</p>
      ) : (
        <ul className="list-group" style={{ maxHeight: "300px", overflowY: "auto" }}>
          {playlists.map((playlist, i) => (
            <li
              key={i}
              className="list-group-item d-flex justify-content-between align-items-center"
              style={{
                backgroundColor: selectedIndex === i ? "gray" : "white",
                color: selectedIndex === i ? "white" : "black",
              }}
            >
              {/* Nombre de la playlist: solo pinta al hacer clic */}
              <div
                className="d-flex align-items-center gap-2"
                style={{ cursor: "pointer" }}
                onClick={() => setSelectedIndex(i)}
              >
                <BsMusicNote className="text-primary" />
                {playlist.nombre}
              </div>

              {/* Botones a la derecha */}
              <div className="d-flex gap-2">
                <Link
                  to={`/mis-playlist/${playlist._id}`}
                  className="btn btn-outline-primary btn-sm"
                >
                  Ver
                </Link>

                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => onSelect(playlist)} // reproduce solo esta playlist
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

export default PlaylistSelector;
