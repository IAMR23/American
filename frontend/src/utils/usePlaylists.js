import { useState, useEffect } from "react";
import axios from "axios";
import { getToken } from "../utils/auth";
import { API_URL } from "../config";
import {
  esErrorSuscripcionInactiva,
  notificarSuscripcionInactiva,
} from "./subscription";

export default function usePlaylists(userId, enabled = false) {
  const [playlists, setPlaylists] = useState([]);
  const [playlistsPropia, setPlaylistsPropia] = useState([]);

  useEffect(() => {
    if (!userId || !enabled) {
      setPlaylists([]);
      setPlaylistsPropia([]);
      return;
    }

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

        console.log("Playlists cargadas");
      } catch (error) {
        console.error("Error cargando playlists", error);
        if (esErrorSuscripcionInactiva(error)) {
          notificarSuscripcionInactiva(error.response?.data || {});
        }
        setPlaylists([]);
        setPlaylistsPropia([]);
      }
    };

    cargarTodo();
  }, [enabled, userId]);

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
      if (esErrorSuscripcionInactiva(err)) {
        notificarSuscripcionInactiva(err.response?.data || {});
      }
      alert("No se pudo crear el playlist. Quizás ya existe.");
    }
  };

  return { playlists, playlistsPropia, handleAddPlaylist };
}
