const bcrypt = require("bcryptjs");
const User = require("../models/User");

exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    const user = await User.findOne({
      resetToken: token,
      resetTokenExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        message: "Token inválido o expirado",
      });
    }

    // Hashear nueva contraseña
    user.password = await bcrypt.hash(newPassword, 10);

    // Limpiar token de recuperación
    user.resetToken = undefined;
    user.resetTokenExpire = undefined;

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
