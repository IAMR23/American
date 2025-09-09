import { useState, useEffect } from "react";
import axios from "axios";
import { getToken } from "../utils/auth";
import { API_URL } from "../config";

export default function usePlaylists(userId) {
  const [playlists, setPlaylists] = useState([]);
  const [playlistsPropia, setPlaylistsPropia] = useState([]);
  const [suscrito, setSuscrito] = useState(false);

  useEffect(() => {
    if (!userId) return;

    const cargarTodo = async () => {
      const token = getToken();
      if (!token) return;

      try {
        const resPlaylists = await axios.get(`${API_URL}/t/playlist/${userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setPlaylists(Array.isArray(resPlaylists.data) ? resPlaylists.data : []);

        const resPropia = await axios.get(`${API_URL}/t2/playlistPropia`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setPlaylistsPropia(Array.isArray(resPropia.data) ? resPropia.data : []);

        const resSub = await axios.get(`${API_URL}/user/suscripcion`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setSuscrito(resSub.data.suscrito === true);

        console.log("Playlists y suscripción cargadas");
      } catch (error) {
        console.error("Error cargando playlists", error);
      }
    };

    cargarTodo();
  }, [userId]);

  const handleAddPlaylist = async (name) => {
    const token = getToken();
    try {
      const res = await axios.post(
        `${API_URL}/t/playlist`,
        { nombre: name },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const nuevaPlaylist = res.data;
      setPlaylists((prev) => (Array.isArray(prev) ? [...prev, nuevaPlaylist] : [nuevaPlaylist]));
      console.log("Playlist creada:", nuevaPlaylist);
    } catch (err) {
      console.error(err.response?.data || err.message);
      alert("No se pudo crear el playlist. Quizás ya existe.");
    }
  };

  return { playlists, playlistsPropia, suscrito, handleAddPlaylist };
}
