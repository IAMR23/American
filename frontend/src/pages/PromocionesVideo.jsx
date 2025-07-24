import React, { useEffect, useState } from "react";
import axios from "axios";
import ReactPlayer from "react-player";
import { API_URL } from "../config";

const API_PUBLICACION = `${API_URL}/publicacion/video`;

export default function PromocionesVideo() {
  const [videos, setVideos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const res = await axios.get(API_PUBLICACION);
        setVideos(res.data);
      } catch (err) {
        setError("Error al cargar los videos");
      } finally {
        setCargando(false);
      }
    };
    fetchVideos();
  }, []);

  if (cargando) return <p>Cargando videos...</p>;
  if (error) return <p className="text-danger">{error}</p>;
  if (videos.length === 0) return <p>No hay videos para mostrar.</p>;

  return (
    <div className="container my-4">
      <h2 className="mb-4 text-white">Galería de Videos</h2>
      <div className="row g-3">
        {videos.slice(0, 16).map((video) => (
          <div key={video._id} className="col-12 col-sm-6 col-md-6 col-lg-3">
            <div className="card  shadow-sm">
              {video.mediaUrl ? (
                <div
                  className="player-wrapper"
                  style={{ position: "relative", paddingTop: "56.25%" /* 16:9 ratio */ }}
                >
                  <ReactPlayer
                    url={video.mediaUrl}
                    controls
                    width="100%"
                    height="100%"
                    style={{ position: "absolute", top: 0, left: 0 }}
                  />
                </div>
              ) : (
                <div
                  style={{
                    height: "180px",
                    backgroundColor: "#ddd",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#555",
                  }}
                >
                  Sin video
                </div>
              )}
            
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
