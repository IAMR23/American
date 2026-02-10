const  crypto =  require("crypto");
const  User = require("../models/User");
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // App Password
  },
});


exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.json({
        message: "Si el correo existe, se enviará un enlace",
      });
    }

    const token = crypto.randomBytes(32).toString("hex");

    user.resetToken = token;
    user.resetTokenExpire = Date.now() + 1000 * 60 * 15; // 15 min

    await user.save();

    const resetLink = `https://american-karaoke.com/reset-password?token=${token}`;

    const info = await transporter.sendMail({
      from: `"American Karaoke" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: "Recuperación de contraseña",
      html: `
        <h2>Recuperar contraseña</h2>
        <p>Haz clic en el siguiente enlace:</p>
        <a href="${resetLink}">${resetLink}</a>
        <p>Este enlace expira en 15 minutos.</p>
      `,
    }); 

    console.log("Correo enviado:", info.messageId);

    res.json({ message: "Revisa tu correo para recuperar la contraseña" });

  } catch (error) {
    console.error("Error enviando correo:", error);
    res.status(500).json({ message: "Error enviando correo" });
  }
};
