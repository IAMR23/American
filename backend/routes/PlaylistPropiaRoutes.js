const express = require("express");
const router = express.Router();

const PlaylistPropia = require("../models/PlaylistPropia");
const createListController = require("../controllers/listController");
const { authenticate } = require("../middleware/authMiddleware");

const playlistController = createListController(PlaylistPropia);

//Playlist.jsauthMiddleware

router.post("/playlistpropia", authenticate, playlistController.createPlaylist);
router.get(
  "/playlistpropia/:userId",
  authenticate,
  playlistController.getUserPlaylists
);
router.get(
  "/playlistpropia/canciones/:playlistId",
  authenticate,
  playlistController.getCancionesDePlaylist
);
router.post(
  "/playlistpropia/:playlistId/addsong",
  authenticate,
  playlistController.addCancionAPlaylist
);
router.post("/playlistpropia/add", authenticate, playlistController.addSong);
router.delete(
  "/playlistpropia/:playlistId/remove/:songId",
  authenticate,
  playlistController.removeSong
);
router.delete(
  "/playlistpropia/:playlistId",
  authenticate,
  playlistController.deletePlaylist
);

router.delete("/playlistpropia/clear/:userId", playlistController.clearList);

module.exports = router;
