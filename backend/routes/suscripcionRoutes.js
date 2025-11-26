const axios = require("axios");
const express = require("express");
const router = express.Router();
const Usuario = require("../models/User"); // Asegúrate de tener esto
const { authenticate } = require("../middleware/authMiddleware");
const { generateAccessToken } = require("../paypal");

const API_PAYPAL = process.env.PAYPAL_API

async function getSubscriptionDetails(subscriptionID) {
  const accessToken = await generateAccessToken();

  const url = `${API_PAYPAL}/v1/billing/subscriptions/${subscriptionID}`;

  try {
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    return response.data;
  } catch (error) {
    console.error("Error consultando la suscripción PayPal:", error.response.data);
    throw error;
  }
}

router.post("/activar-suscripcion", async (req, res) => {
  const { userId, subscriptionID } = req.body;

  if (!userId || !subscriptionID) {
    return res.status(400).json({ message: "Faltan parámetros" });
  }

  try {
    const subscription = await getSubscriptionDetails(subscriptionID);

    if (subscription.status === "ACTIVE") {
      await Usuario.updateOne(
        { _id: userId },
        {
          suscrito: true,
          paypalSubscriptionID: subscriptionID,
          subscriptionStart: new Date(subscription.start_time),
          subscriptionEnd: new Date(subscription.billing_info.next_billing_time),
        }
      );

      return res.json({ message: "Suscripción activada correctamente" });
    } else {
      return res.status(400).json({ message: `Suscripción no activa: ${subscription.status}` });
    }
  } catch (error) {
    return res.status(500).json({ message: "Error activando suscripción", error: error.message });
  }
});


module.exports = router;
