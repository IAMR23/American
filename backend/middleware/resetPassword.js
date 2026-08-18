const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { validatePasswordStrength } = require("../utils/userSecurity");

exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (typeof token !== "string" || !token.trim()) {
      return res.status(400).json({
        message: "Token inválido o expirado",
      });
    }

    const passwordError = validatePasswordStrength(newPassword);

    if (passwordError) {
      return res.status(400).json({ message: passwordError });
    }

    const user = await User.findOne({
      resetToken: token,
      resetTokenExpire: { $gt: Date.now() },
    }).select("+password +resetToken +resetTokenExpire +tokenVersion");

    if (!user) {
      return res.status(400).json({
        message: "Token inválido o expirado",
      });
    }

    // Hashear nueva contraseña
    user.password = await bcrypt.hash(newPassword, 10);

    // Limpiar token de recuperación
    user.resetToken = null;
    user.resetTokenExpire = null;

    // 🔴 INVALIDAR TODAS LAS SESIONES ACTIVAS
    user.tokenVersion += 1;

    await user.save();

    res.json({
      message:
        "Contraseña actualizada correctamente. Inicie sesión nuevamente.",
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Error al resetear la contraseña",
    });
  }
};
