import React, { useEffect, useState } from "react";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import { BsTrash, BsXCircle } from "react-icons/bs";
import { API_URL } from "../config"
import { getYoutubeThumbnail } from "../utils/getYoutubeThumbnail";
import { getToken } from "../utils/auth";

const API_FAVORITOS = `${API_URL}/t/favoritos`; // ajusta según tu backend


const FavoritosPage = () => {
  const token = getToken();
  const decoded = jwtDecode(token);
  const userId = decoded.userId;

  const [canciones, setCanciones] = useState([]);
  const [videoSeleccionado, setVideoSeleccionado] = useState(null);
  const [cargando, setCargando] = useState(true);

  const headers = {
    Authorization: `Bearer ${token}`,
  };

  const cargarFavoritos = async () => {
    try {
      setCargando(true);
      const res = await axios.get(`${API_FAVORITOS}/${userId}`, { headers });
      setCanciones(res.data?.canciones || []);
    } catch (err) {
      setCanciones(res.data?.canciones || []);
      console.error("Error al obtener favoritos:", err);
    } finally {
      setCargando(false);
    }
  };

  const eliminarCancion = async (songId) => {
    try {
      await axios.delete(`${API_FAVORITOS}/remove`, {
        data: { songId },
        headers,
      });
      cargarFavoritos();
    } catch (err) {
      console.error("Error al eliminar canción:", err);
    }
  };

  const vaciarFavoritos = async () => {
    try {
      await axios.delete(`${API_FAVORITOS}/clear/${userId}`, { headers });
      cargarFavoritos();
    } catch (err) {
      console.error("Error al vaciar favoritos:", err);
    }
  };

  useEffect(() => {
    cargarFavoritos();
  }, []);

  if (cargando) return <p>Cargando favoritos...</p>;

  return (
    <div className="container mt-4 ">
      <h2>Mis Favoritos</h2>

      {canciones.length === 0 ? (
        <p>No tienes canciones favoritas.</p>
      ) : (
        <>
          <div className="d-flex justify-content-end mb-3">
            <button className="btn btn-danger" onClick={vaciarFavoritos}>
              Vaciar lista
            </button>
          </div>

          <table className="table table-hover table-dark ">
            <thead>
              <tr>
                <th>Título y Artista</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody >
              {canciones.map((video) => {
                const thumbnail = getYoutubeThumbnail(video.videoUrl);
                return (
                  <tr
                    key={video._id}
                    style={{ cursor: "pointer" }}
                  >              
                    <td>
                      <div className="fw-bold">{video.titulo}</div>
                      <small className="text-muted">{video.artista}</small>
                    </td>
                    <td>
                      <button
                        className="btn btn-sm btn-outline-danger d-flex align-items-center justify-content-center p-1"
                        onClick={(e) => {
                          e.stopPropagation(); // Evitar que se active el 
                          eliminarCancion(video._id);
                        }}
                        title="Quitar de favoritos"
                      >
                        <BsTrash size={20} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

        
        </>
      )}
    </div>
  );
};

export default FavoritosPage;
