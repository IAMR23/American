import React, { useState } from "react";
import { BsMusicNote } from "react-icons/bs";
import { Link } from "react-router-dom";
import { useQueueContext } from "../hooks/QueueProvider";

const PlaylistSugeridos = ({ playlists, onSelectAll }) => {
  const isValidArray = Array.isArray(playlists);
  const [selectedIndex, setSelectedIndex] = useState(null); // estado para el seleccionado

  const { setNuevaCola } = useQueueContext();

  return (
    <div
      className="bg-white p-4 rounded shadow-sm w-100"
      style={{ maxWidth: "100%", height: "80%" }}
    >
      <div className="d-flex align-items-center mb-3">
        <BsMusicNote size={24} className="me-2 text-primary" />
        <h3 className="mb-0">Playlists Sugeridos</h3>
      </div>

      {!isValidArray || playlists.length === 0 ? (
        <p className="text-muted text-center">No tienes playlists aún.</p>
      ) : (
        <ul
          className="list-group"
          style={{ maxHeight: "500px", overflowY: "auto" }}
        >
          {playlists.map((playlist, i) => (
            <li
              key={i}
              className="list-group-item d-flex justify-content-between align-items-center"
              style={{
                backgroundColor: selectedIndex === i ? "white" : "white",
                color: selectedIndex === i ? "blue" : "black",
                transition: "all 0.3s ease", // animación suave
              }}
            >
              <div
                className="d-flex align-items-center gap-2"
                style={{ cursor: "pointer" }}
                onClick={() => {
                  if (playlist.canciones) {
                    setNuevaCola(playlist.canciones, 0);
                    onSelectAll?.();
                  }
                }}
              >
                <BsMusicNote className="text-primary" />
                {playlist.nombre}
              </div>

              <Link
                to={`/playlistPopular/${playlist._id}`}
                className="btn btn-outline-primary btn-sm"
              >
                Ver Playlist
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default PlaylistSugeridos;
