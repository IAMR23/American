const axios = require("axios");
const { randomUUID } = require("crypto");

const PLAN_ID_PATTERN = /^P-[A-Z0-9]+$/;

class PaypalSubscriptionError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.name = "PaypalSubscriptionError";
    this.statusCode = statusCode;
  }
}

function createPaypalSubscriptionService({
  apiBaseUrl,
  generateAccessToken,
  httpClient = axios,
  requestIdFactory = randomUUID,
}) {
  async function createSubscription({ planId, userId, productId }) {
    const normalizedPlanId = String(planId || "").trim().toUpperCase();
    const normalizedUserId = String(userId || "").trim();
    const normalizedProductId = String(productId || "").trim();

    if (!PLAN_ID_PATTERN.test(normalizedPlanId)) {
      throw new PaypalSubscriptionError("El plan de PayPal no es válido.", 400);
    }

    if (!normalizedUserId) {
      throw new PaypalSubscriptionError("El usuario no es válido.", 400);
    }

    if (!normalizedProductId) {
      throw new PaypalSubscriptionError(
        "No hay un producto de suscripción activo.",
        409,
      );
    }

    const accessToken = await generateAccessToken();
    if (!accessToken) {
      throw new PaypalSubscriptionError(
        "No se pudo autenticar la operación con PayPal.",
        502,
      );
    }

    const paypalHeaders = {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    };
    const planResponse = await httpClient.get(
      `${apiBaseUrl}/v1/billing/plans/${normalizedPlanId}`,
      { headers: paypalHeaders },
    );
    const plan = planResponse.data;

    if (
      plan?.status !== "ACTIVE" ||
      String(plan?.product_id || "") !== normalizedProductId
    ) {
      throw new PaypalSubscriptionError(
        "El plan no pertenece a la oferta activa.",
        400,
      );
    }

    const response = await httpClient.post(
      `${apiBaseUrl}/v1/billing/subscriptions`,
      {
        plan_id: normalizedPlanId,
        custom_id: normalizedUserId,
        application_context: {
          brand_name: "American Karaoke",
          locale: "es-EC",
          shipping_preference: "NO_SHIPPING",
          user_action: "SUBSCRIBE_NOW",
        },
      },
      {
        headers: {
          ...paypalHeaders,
          "PayPal-Request-Id": requestIdFactory(),
        },
      },
    );

    if (!response.data?.id) {
      throw new PaypalSubscriptionError(
        "PayPal no devolvió un identificador de suscripción.",
        502,
      );
    }

    return response.data;
  }

  return { createSubscription };
}

module.exports = {
  PLAN_ID_PATTERN,
  PaypalSubscriptionError,
  createPaypalSubscriptionService,
};
