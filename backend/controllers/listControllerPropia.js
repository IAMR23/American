const PlaylistPropia = require("../models/PlaylistPropia");
const Cancion = require("../models/Cancion");

// controllers/listController.js
function createListController(Model) {
  return {
    async addSong(req, res) {
      try {
        const { songId } = req.body;
        const userId = req.user.id;

        if (!songId) {
          return res.status(400).json({ error: "Falta el ID de la canción" });
        }

        let list = await Model.findOne({ user: userId });

        if (!list) {
          list = new Model({ user: userId, canciones: [] });
        }

        // Asegura que 'canciones' sea un array
        list.canciones = list.canciones || [];

        // Verifica si ya existe la canción (conversión segura a string)
        const yaExiste = list.canciones.some(
          (id) => id.toString() === songId.toString()
        );

        if (!yaExiste) {
          list.canciones.push(songId);
          await list.save();
          return res.status(200).json({ mensaje: "Canción agregada", list });
        } else {
          return res
            .status(200)
            .json({ mensaje: "La canción ya está en la lista", list });
        }
      } catch (error) {
        console.error("Error en addSong:", error);
        return res.status(500).json({ error: "Error al agregar la canción" });
      }
    },

    async removeSong(req, res) {
      const { playlistId, songId } = req.params;
      try {
        const playlist = await PlaylistPropia.findById(playlistId);
        if (!playlist)
          return res
            .status(404)
            .json({ message: "PlaylistPropia no encontrada" });

        playlist.canciones = playlist.canciones.filter(
          (id) => id.toString() !== songId
        );
        await playlist.save();

        res.status(200).json({ message: "Canción eliminada", playlist });
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error del servidor" });
      }
    },
    async getList(req, res) {
      const userId = req.params.userId;
      const list = await Model.findOne({ user: userId }).populate("canciones");
      res.status(200).json(list || { canciones: [] });
    },

    async clearList(req, res) {
      const userId = req.params.userId;
      const list = await Model.findOne({ user: userId });
      if (list) {
        list.canciones = [];
        await list.save();
      }
      res.status(200).json({ message: "Lista vaciada" });
    },

    //Estos son los del playlist

    async createPlaylist(req, res) {
      const { nombre } = req.body;
      const userId = req.user.id;
      if (!nombre) {
        return res.status(400).json({ error: "El nombre es obligatorio" });
      }

      try {
        const existe = await PlaylistPropia.findOne({ user: userId, nombre });
        if (existe) {
          return res
            .status(400)
            .json({ error: "Ya existe una playlist con ese nombre" });
        }

        const nueva = new PlaylistPropia({
          user: userId,
          nombre,
          canciones: [],
        });
        await nueva.save();
        res.status(201).json(nueva);
      } catch (err) {
        console.error("Error en createPlaylist:", err); // 👈 añade esto
        res.status(500).json({ error: "Error al crear la playlist" });
      }
    },

    async getUserPlaylists(req, res) {
      try {
        const page = Math.max(parseInt(req.query.page, 10) || 0, 0);
        const limit = Math.min(
          Math.max(parseInt(req.query.limit, 10) || 0, 0),
          100,
        );

        if (page && limit) {
          const skip = (page - 1) * limit;
          const [playlists, total] = await Promise.all([
            PlaylistPropia.find()
              .sort({ createdAt: -1, _id: -1 })
              .select("nombre user canciones createdAt")
              .skip(skip)
              .limit(limit)
              .lean(),
            PlaylistPropia.countDocuments(),
          ]);
          const totalPages = Math.ceil(total / limit);

          return res.status(200).json({
            playlists: playlists.map((playlist) => ({
              ...playlist,
              cancionesCount: playlist.canciones?.length || 0,
            })),
            total,
            page,
            limit,
            totalPages,
            hasMore: page < totalPages,
          });
        }

        const playlists = await PlaylistPropia.find().populate("canciones");
        res.status(200).json(playlists);
      } catch (error) {
        console.error("Error al obtener las playlists del usuario:", error);
        res.status(500).json({ error: "Error al obtener las playlists" });
      }
    },

    async getUserPlaylistsParams(req, res) {
      const userId = req.params.userId || req.user.id;

      try {
        const playlists = await PlaylistPropia.find({ user: userId }).populate(
          "canciones"
        );
        res.status(200).json(playlists);
      } catch (error) {
        console.error("Error al obtener las playlists del usuario:", error);
        res.status(500).json({ error: "Error al obtener las playlists" });
      }
    },

    async getCancionesDePlaylist(req, res) {
      const { playlistId } = req.params;

      try {
        const page = Math.max(parseInt(req.query.page, 10) || 0, 0);
        const limit = Math.min(
          Math.max(parseInt(req.query.limit, 10) || 0, 0),
          100,
        );

        if (page && limit) {
          const playlistBase = await PlaylistPropia.findById(playlistId).select(
            "nombre canciones",
          );

          if (!playlistBase) {
            return res
              .status(404)
              .json({ error: "PlaylistPropia no encontrada" });
          }

          const total = playlistBase.canciones?.length || 0;
          const totalPages = Math.ceil(total / limit);
          const idsPagina = (playlistBase.canciones || []).slice(
            (page - 1) * limit,
            page * limit,
          );
          const canciones = await Cancion.find({ _id: { $in: idsPagina } })
            .populate("generos", "nombre")
            .lean();
          const cancionesPorId = new Map(
            canciones.map((cancion) => [String(cancion._id), cancion]),
          );

          return res.status(200).json({
            nombre: playlistBase.nombre,
            canciones: idsPagina
              .map((id) => cancionesPorId.get(String(id)))
              .filter(Boolean),
            total,
            page,
            limit,
            totalPages,
            hasMore: page < totalPages,
          });
        }

        const playlist = await PlaylistPropia.findById(playlistId).populate(
          "canciones"
        );

        if (!playlist) {
          return res
            .status(404)
            .json({ error: "PlaylistPropia no encontrada" });
        }

        res.status(200).json({
          nombre: playlist.nombre, // Añade el nombre de la playlist
          canciones: playlist.canciones, // Canciones pobladas
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
        const playlist = await PlaylistPropia.findById(playlistId);
        if (!playlist) {
          return res
            .status(404)
            .json({ error: "PlaylistPropia no encontrada" });
        }

        // Verificar si la canción ya existe en el playlist
        const yaExiste = playlist.canciones.some(
          (id) => id.toString() === songId.toString()
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
      const userId = req.user.id;

      try {
        // Buscar la playlist y asegurarse que pertenece al usuario
        const playlist = await PlaylistPropia.findOne({
          _id: playlistId,
          user: userId,
        });

        if (!playlist) {
          return res
            .status(404)
            .json({ error: "PlaylistPropia no encontrada" });
        }

        // Eliminar la playlist
        await PlaylistPropia.deleteOne({ _id: playlistId });

        res
          .status(200)
          .json({ message: "PlaylistPropia eliminada correctamente" });
      } catch (error) {
        console.error("Error al eliminar la playlist:", error);
        res.status(500).json({ error: "Error del servidor" });
      }
    },
  };
}

module.exports = createListController;
