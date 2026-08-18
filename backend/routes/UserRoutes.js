const express = require("express");
const {
  createUser,
  updateUser,
  getUserById,
  deleteUser,
  getUsers,
} = require("../controllers/userController");
const { authenticate, isAdmin } = require("../middleware/authMiddleware");
const { createRateLimiter } = require("../middleware/rateLimit");

const router = express.Router();
const registerLimiter = createRateLimiter({
  keyPrefix: "auth:register",
  windowMs: 15 * 60 * 1000,
  max: 10,
});

// Ruta para crear un usuario
router.post("/user", registerLimiter, createUser);
router.get("/users", authenticate, isAdmin, getUsers);

// Ruta para actualizar un usuario por su ID
router.patch("/users/:id", authenticate, isAdmin, updateUser);

// Ruta para obtener un usuario por su ID
router.get("/users/:id", authenticate, isAdmin, getUserById);

// Ruta para eliminar un usuario por su ID
router.delete("/user/:id", authenticate, isAdmin, deleteUser);

module.exports = router;
