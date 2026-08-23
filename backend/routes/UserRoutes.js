const express = require("express");
const {
  createUser,
  updateUser,
  updateUserSubscription,
  getUserById,
  deleteUser,
  getUsers,
} = require("../controllers/userController");
const {
  authenticate,
  optionalAuthenticate,
  isAdmin,
} = require("../middleware/authMiddleware");

const router = express.Router();

// Ruta para crear un usuario
router.post("/user", optionalAuthenticate, createUser);
router.get("/users", authenticate, isAdmin, getUsers);

// Ruta para actualizar un usuario por su ID
router.patch("/users/:id", authenticate, isAdmin, updateUser);
router.patch(
  "/users/:id/subscription",
  authenticate,
  isAdmin,
  updateUserSubscription
);

// Ruta para obtener un usuario por su ID
router.get("/users/:id", authenticate, getUserById);

// Ruta para eliminar un usuario por su ID
router.delete("/user/:id", authenticate, isAdmin, deleteUser);

module.exports = router;
