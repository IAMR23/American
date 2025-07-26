// src/pages/ReproductorPage.jsx
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import VideoPlayer from "../components/VideoPlayer";
import { API_URL } from "../config";

export default function ReproductorPage() {
  const { id } = useParams();
  const [cancion, setCancion] = useState(null);

  useEffect(() => {
    const fetchCancion = async () => {
      try {
        const res = await axios.get(`${API_URL}/song/${id}`);
        setCancion(res.data);
      } catch (err) {
        console.error("Error cargando la canción", err);
      }
    };
    fetchCancion();
  }, [id]);

  if (!cancion) {
    return <div style={{ color: "white", textAlign: "center", padding: 50 }}>Cargando canción...</div>;
  }

  return (
    <VideoPlayer
      cola={[cancion]}
      currentIndex={0}
      setCurrentIndex={() => {}}
      fullscreenRequested={true}
      onFullscreenHandled={() => {}}
    />
  );
}
