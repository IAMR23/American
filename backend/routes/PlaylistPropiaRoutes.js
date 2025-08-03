const express = require("express");
const router = express.Router();

const PlaylistPropia = require("../models/PlaylistPropia");
const createListControllerPropia = require("../controllers/listControllerPropia");
const { authenticate } = require("../middleware/authMiddleware");

const listControllerPropia = createListControllerPropia(PlaylistPropia);

//Playlist.jsauthMiddleware

router.post("/playlistpropia", authenticate, listControllerPropia.createPlaylist);
router.get(
  "/playlistpropia/",
  listControllerPropia.getUserPlaylists
);
router.get(
  "/playlistpropia/canciones/:playlistId",
  authenticate,
  listControllerPropia.getCancionesDePlaylist
);
router.post(
  "/playlistpropia/:playlistId/addsong",
  authenticate,
  listControllerPropia.addCancionAPlaylist
);
router.post("/playlistpropia/add", authenticate, listControllerPropia.addSong);
router.delete(
  "/playlistpropia/:playlistId/remove/:songId",
  authenticate,
  listControllerPropia.removeSong
);
router.delete(
  "/playlistpropia/:playlistId",
  authenticate,
  listControllerPropia.deletePlaylist
);

router.delete("/playlistpropia/clear/:userId", listControllerPropia.clearList);

module.exports = router;
