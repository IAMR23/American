const express = require("express");
const router = express.Router();
const Usuario = require("../models/User");
const { authenticate } = require("../middleware/authMiddleware");
const { generateAccessToken } = require("../paypal");
const {
  createPaypalWebhookService,
} = require("../services/paypalWebhookService");

const API_PAYPAL = process.env.PAYPAL_API;
const paypalSubscriptions = createPaypalWebhookService({
  apiBaseUrl: API_PAYPAL,
  webhookId: process.env.PAYPAL_WEBHOOK_ID,
  generateAccessToken,
  UserModel: Usuario,
});

function validDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

router.post("/activar-suscripcion", authenticate, async (req, res) => {
  const { subscriptionID } = req.body;
  const userId = String(req.user._id);

  if (!subscriptionID) {
    return res.status(400).json({ message: "Falta subscriptionID" });
  }

  try {
    const subscription =
      await paypalSubscriptions.getSubscriptionDetails(subscriptionID);

    if (String(subscription.custom_id || "") !== userId) {
      return res.status(403).json({
        message: "La suscripción no pertenece al usuario autenticado.",
      });
    }

    if (subscription.status !== "ACTIVE") {
      return res.status(400).json({
        message: `Suscripción no activa: ${subscription.status}`,
      });
    }

    const update = {
      paypalSubscriptionID: subscriptionID,
      paypalSubscriptionStatus: subscription.status,
    };
    const start = validDate(subscription.start_time);
    const end = validDate(subscription.billing_info?.next_billing_time);

    if (start) update.subscriptionStart = start;
    if (end) update.subscriptionEnd = end;

    await Usuario.updateOne({ _id: userId }, { $set: update });

    return res.status(202).json({
      message: "Suscripción registrada. Esperando confirmación del pago.",
    });
  } catch (error) {
    console.error(
      "Error registrando suscripción:",
      error.response?.data || error.message,
    );
    return res.status(500).json({
      message: "Error registrando suscripción",
    });
  }
});

router.post("/webhook/paypal", async (req, res) => {
  try {
    const isValid = await paypalSubscriptions.verifyWebhook(
      req.headers,
      req.body,
    );

    if (!isValid) {
      return res.status(400).json({ message: "Firma de webhook inválida" });
    }

    const result = await paypalSubscriptions.processEvent(req.body);
    console.log("Webhook PayPal procesado:", {
      eventId: req.body?.id,
      eventType: req.body?.event_type,
      ...result,
    });

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error(
      "Error procesando webhook PayPal:",
      error.response?.data || error.message,
    );
    return res.status(500).json({ message: "Error procesando webhook" });
  }
});

module.exports = router;
