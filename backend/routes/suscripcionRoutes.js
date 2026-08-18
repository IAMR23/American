const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/authMiddleware");
const {
  activateSubscriptionForUser,
  getSafePaypalError,
  handlePaypalWebhookEvent,
  verifyPaypalWebhookSignature,
} = require("../services/paypalSubscriptionService");

router.post("/activar-suscripcion", authenticate, async (req, res) => {
  const { subscriptionID } = req.body;

  if (!subscriptionID) {
    return res.status(400).json({ message: "subscriptionID requerido" });
  }

  try {
    const result = await activateSubscriptionForUser({
      userId: req.user._id,
      subscriptionID,
    });

    return res.json({
      message: "Suscripcion activada correctamente",
      ...result,
    });
  } catch (error) {
    console.error("Error activando suscripcion:", getSafePaypalError(error));
    return res.status(error.statusCode || 500).json({
      code: error.code || "SUBSCRIPTION_ACTIVATION_FAILED",
      message: error.message || "Error activando suscripcion",
    });
  }
});

router.post("/paypal/webhook", async (req, res) => {
  try {
    const verified = await verifyPaypalWebhookSignature(req.headers, req.body);

    if (!verified) {
      return res.status(400).json({ message: "Firma PayPal invalida" });
    }

    const result = await handlePaypalWebhookEvent(req.body);
    return res.status(200).json({ received: true, ...result });
  } catch (error) {
    console.error("Error procesando webhook PayPal:", getSafePaypalError(error));
    return res.status(error.statusCode || 500).json({
      code: error.code || "PAYPAL_WEBHOOK_ERROR",
      message: error.message || "Error procesando webhook PayPal",
    });
  }
});

module.exports = router;
