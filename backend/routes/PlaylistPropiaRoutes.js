const express = require("express");
const router = express.Router();

const PlaylistPropia = require("../models/PlaylistPropia");
const createListControllerPropia = require("../controllers/listControllerPropia");
const {
  authenticate,
  verificarSuscripcionActiva,
} = require("../middleware/authMiddleware");

const listControllerPropia = createListControllerPropia(PlaylistPropia);
const protegerPremium = [authenticate, verificarSuscripcionActiva];

//Playlist.jsauthMiddleware

router.post(
  "/playlistpropia",
  ...protegerPremium,
  listControllerPropia.createPlaylist
);
router.get("/playlistpropia", ...protegerPremium, listControllerPropia.getUserPlaylists);
router.get(
  "/playlistpropia/canciones/:playlistId",
  ...protegerPremium,
  listControllerPropia.getCancionesDePlaylist
);
router.post(
  "/playlistpropia/:playlistId/addsong",
  ...protegerPremium,
  listControllerPropia.addCancionAPlaylist
);
router.post("/playlistpropia/add", ...protegerPremium, listControllerPropia.addSong);
router.delete(
  "/playlistpropia/:playlistId/remove/:songId",
  ...protegerPremium,
  listControllerPropia.removeSong
);
router.delete(
  "/playlistpropia/:playlistId",
  ...protegerPremium,
  listControllerPropia.deletePlaylist
);

router.delete("/playlistpropia/clear/:userId", ...protegerPremium, listControllerPropia.clearList);

module.exports = router;
