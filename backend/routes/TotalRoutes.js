const express = require("express");
const router = express.Router();


const Favorito = require("../models/Favorito");
const Playlist = require("../models/Playlist");
const Cola = require("../models/Cola");
const createListController = require("../controllers/listController");
const { authenticate } = require("../middleware/authMiddleware");

const favoritoController = createListController(Favorito);
const playlistController = createListController(Playlist);
const colaController = createListController(Cola);

// ejemplo: favoritoRoutes.js
router.post("/favoritos/add", authenticate ,  favoritoController.addSong);
router.delete("/favoritos/remove", authenticate ,  favoritoController.removeSong);
router.get("/favoritos/:userId",authenticate ,  favoritoController.getList);
router.delete("/favoritos/clear/:userId", authenticate , favoritoController.clearList);

// ejemplo: ColaRoutes.js
router.post("/cola/add", authenticate, colaController.addSong);
router.delete("/cola/remove", colaController.removeSong);
router.get("/cola/:userId", colaController.getList);
router.delete("/cola/clear/:userId", colaController.clearList);

//Playlist.js 

router.post("/playlist", authenticate, playlistController.createPlaylist);
router.get("/playlist/:userId", playlistController.getUserPlaylists);
router.get("/playlist/canciones/:playlistId", authenticate, playlistController.getCancionesDePlaylist);
router.post(
  "/playlist/:playlistId/addsong",
  authenticate,
  playlistController.addCancionAPlaylist
);
router.post("/playlist/add", authenticate, playlistController.addSong);
router.delete("/playlist/remove", playlistController.removeSong);
router.delete("/playlist/clear/:userId", playlistController.clearList);


module.exports = router;


  