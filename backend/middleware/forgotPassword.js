// POST /auth/forgot-password
const  crypto =  require("crypto");
const  User = require("../models/User");

exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
console.log(email)
  const user = await User.findOne({  email });
  if (!user) {
    return res.json({ message: "Si el correo existe, se enviará un enlace" });
  }

  const token = crypto.randomBytes(32).toString("hex");

  user.resetToken = token;
  user.resetTokenExpire = Date.now() + 1000 * 60 * 15; // 15 minutos

  await user.save();

  const resetLink = `https://american-karaoke.com/reset-password?token=${token}`;

  res.json({ message: "Revisa tu correo para recuperar la contraseña" });
};
