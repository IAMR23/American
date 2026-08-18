const getUserId = (req) => req.user?._id || req.user?.id;
const esAdmin = (req) => req.user?.rol === "admin";
const queryPropia = (req, playlistId) =>
  esAdmin(req) ? { _id: playlistId } : { _id: playlistId, user: getUserId(req) };

function createListController(Model) {
  return {
    async addSong(req, res) {
      try {
        const { songId } = req.body;
        const userId = getUserId(req);

        if (!songId) {
          return res.status(400).json({ error: "Falta el ID de la canción" });
        }

        const list = await Model.findOneAndUpdate(
          { user: userId },
          {
            $setOnInsert: { user: userId },
            $addToSet: { canciones: songId },
          },
          { upsert: true, new: true, setDefaultsOnInsert: true },
        );

        return res.status(200).json({ mensaje: "Canción agregada", list });
      } catch (error) {
        console.error("Error en addSong:", error);
        return res.status(500).json({ error: "Error al agregar la canción" });
      }
    },

    async removeSong(req, res) {
      const { playlistId, songId } = req.params;

      try {
        const playlist = await Model.findOne(queryPropia(req, playlistId));

        if (!playlist) {
          return res.status(404).json({ message: "Playlist no encontrada" });
        }

        playlist.canciones = playlist.canciones.filter(
          (id) => id.toString() !== songId,
        );
        await playlist.save();

        return res.status(200).json({ message: "Canción eliminada", playlist });
      } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Error del servidor" });
      }
    },

    async getList(req, res) {
      const userId = getUserId(req);
      const list = await Model.findOne({ user: userId }).populate("canciones");
      res.status(200).json(list || { canciones: [] });
    },

    async clearList(req, res) {
      const userId = getUserId(req);
      const list = await Model.findOne({ user: userId });

      if (list) {
        list.canciones = [];
        await list.save();
      }

      res.status(200).json({ message: "Lista vaciada" });
    },

    async createPlaylist(req, res) {
      const { nombre } = req.body;
      const userId = getUserId(req);

      if (!nombre) {
        return res.status(400).json({ error: "El nombre es obligatorio" });
      }

      try {
        const existe = await Model.findOne({ user: userId, nombre });
        if (existe) {
          return res
            .status(400)
            .json({ error: "Ya existe una playlist con ese nombre" });
        }

        const nueva = new Model({ user: userId, nombre, canciones: [] });
        await nueva.save();
        return res.status(201).json(nueva);
      } catch (err) {
        console.error("Error en createPlaylist:", err);
        return res.status(500).json({ error: "Error al crear la playlist" });
      }
    },

    async getUserPlaylists(req, res) {
      try {
        const userId = getUserId(req);
        const playlists = await Model.find({ user: userId }).populate(
          "canciones",
        );
        res.status(200).json(playlists);
      } catch (error) {
        console.error("Error al obtener las playlists del usuario:", error);
        res.status(500).json({ error: "Error al obtener las playlists" });
      }
    },

    async getUserPlaylistsParams(req, res) {
      return this.getUserPlaylists(req, res);
    },

    async getCancionesDePlaylist(req, res) {
      const { playlistId } = req.params;

      try {
        const playlist = await Model.findOne(queryPropia(req, playlistId)).populate(
          "canciones",
        );

        if (!playlist) {
          return res.status(404).json({ error: "Playlist no encontrada" });
        }

        res.status(200).json({
          nombre: playlist.nombre,
          canciones: playlist.canciones,
        });
      } catch (error) {
        console.error("Error al obtener canciones del playlist:", error);
        res.status(500).json({ error: "Error del servidor" });
      }
    },

    async addCancionAPlaylist(req, res) {
      const { playlistId } = req.params;
      const { songId } = req.body;

      if (!songId) {
        return res.status(400).json({ error: "Falta el ID de la canción" });
      }

      try {
        const playlist = await Model.findOne(queryPropia(req, playlistId));
        if (!playlist) {
          return res.status(404).json({ error: "Playlist no encontrada" });
        }

        const yaExiste = playlist.canciones.some(
          (id) => id.toString() === songId.toString(),
        );

        if (yaExiste) {
          return res
            .status(200)
            .json({ mensaje: "La canción ya está en el playlist", playlist });
        }

        playlist.canciones.push(songId);
        await playlist.save();

        res.status(200).json({ mensaje: "Canción agregada", playlist });
      } catch (error) {
        console.error("Error al agregar canción al playlist:", error);
        res.status(500).json({ error: "Error del servidor" });
      }
    },

    async deletePlaylist(req, res) {
      const { playlistId } = req.params;

      try {
        const playlist = await Model.findOne(queryPropia(req, playlistId));

        if (!playlist) {
          return res.status(404).json({ error: "Playlist no encontrada" });
        }

        await Model.deleteOne({ _id: playlistId });

        res.status(200).json({ message: "Playlist eliminada correctamente" });
      } catch (error) {
        console.error("Error al eliminar la playlist:", error);
        res.status(500).json({ error: "Error del servidor" });
      }
    },
  };
}

module.exports = createListController;
