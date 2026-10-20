import nodemailer from 'nodemailer';

let transporter;
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character]);

function getTransporter() {
  if (transporter) return transporter;
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error('El servicio SMTP no está configurado.');
  }
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  return transporter;
}

export async function sendPasswordResetEmail({ email, name, resetUrl }) {
  const safeName = escapeHtml(name);
  const safeUrl = escapeHtml(resetUrl);
  await getTransporter().sendMail({
    from: process.env.EMAIL_FROM || `El Estante <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'Recupera tu contraseña de El Estante',
    text: `Hola ${name}. Usa este enlace para crear una nueva contraseña: ${resetUrl}\n\nEl enlace vence en 30 minutos. Si no solicitaste este cambio, ignora el mensaje.`,
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#29251f"><h1>Recupera tu contraseña</h1><p>Hola ${safeName}, recibimos una solicitud para cambiar tu contraseña.</p><p><a href="${safeUrl}" style="display:inline-block;padding:12px 20px;border-radius:24px;background:#d5af62;color:#15120d;text-decoration:none;font-weight:bold">Crear nueva contraseña</a></p><p>El enlace vence en 30 minutos y solo puede utilizarse una vez.</p><p>Si no solicitaste este cambio, ignora el mensaje.</p></div>`,
  });
}
