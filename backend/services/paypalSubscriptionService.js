const axios = require("axios");
const Usuario = require("../models/User");
const Plan = require("../models/Plan");
const Producto = require("../models/Producto");
const Pago = require("../models/Pago");
const PaypalWebhookEvent = require("../models/PaypalWebhookEvent");
const { generateAccessToken } = require("../paypal");
const { serializeUser } = require("../utils/userSecurity");

class PaypalSubscriptionError extends Error {
  constructor(message, statusCode = 400, code = "PAYPAL_SUBSCRIPTION_ERROR") {
    super(message);
    this.name = "PaypalSubscriptionError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

const ACTIVE_PAYPAL_STATUS = "ACTIVE";
const CANCELLED_EVENT_TYPES = new Set([
  "BILLING.SUBSCRIPTION.CANCELLED",
  "BILLING.SUBSCRIPTION.SUSPENDED",
  "BILLING.SUBSCRIPTION.EXPIRED",
]);
const PAYMENT_COMPLETED_EVENT_TYPES = new Set([
  "BILLING.SUBSCRIPTION.PAYMENT.COMPLETED",
  "PAYMENT.SALE.COMPLETED",
  "PAYMENT.CAPTURE.COMPLETED",
]);
const PAYMENT_FAILED_EVENT_TYPES = new Set([
  "BILLING.SUBSCRIPTION.PAYMENT.FAILED",
  "PAYMENT.SALE.DENIED",
]);
const REFUND_EVENT_TYPES = new Set([
  "PAYMENT.SALE.REFUNDED",
  "PAYMENT.CAPTURE.REFUNDED",
]);

const getPaypalApiBase = () => {
  if (!process.env.PAYPAL_API) {
    throw new PaypalSubscriptionError(
      "PAYPAL_API no esta configurado",
      500,
      "PAYPAL_CONFIG_MISSING",
    );
  }

  return process.env.PAYPAL_API.replace(/\/$/, "");
};

const getSafePaypalError = (error) => error.response?.data || error.message;

const paypalRequest = async ({ method, path, data, params }) => {
  const accessToken = await generateAccessToken();
  const response = await axios({
    method,
    url: `${getPaypalApiBase()}${path}`,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    data,
    params,
  });

  return response.data;
};

const parsePaypalDate = (value, fieldName) => {
  if (!value) {
    throw new PaypalSubscriptionError(
      `PayPal no devolvio ${fieldName}`,
      400,
      "PAYPAL_DATE_MISSING",
    );
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new PaypalSubscriptionError(
      `PayPal devolvio ${fieldName} invalida`,
      400,
      "PAYPAL_DATE_INVALID",
    );
  }

  return date;
};

const getSubscriptionDetails = async (subscriptionID) => {
  if (typeof subscriptionID !== "string" || !subscriptionID.trim()) {
    throw new PaypalSubscriptionError(
      "subscriptionID requerido",
      400,
      "SUBSCRIPTION_ID_REQUIRED",
    );
  }

  try {
    return await paypalRequest({
      method: "GET",
      path: `/v1/billing/subscriptions/${encodeURIComponent(
        subscriptionID.trim(),
      )}`,
    });
  } catch (error) {
    console.error("Error consultando suscripcion PayPal:", getSafePaypalError(error));
    throw new PaypalSubscriptionError(
      "No se pudo consultar la suscripcion en PayPal",
      error.response?.status || 502,
      "PAYPAL_SUBSCRIPTION_LOOKUP_FAILED",
    );
  }
};

const getPaypalPlanDetails = async (planId) => {
  try {
    return await paypalRequest({
      method: "GET",
      path: `/v1/billing/plans/${encodeURIComponent(planId)}`,
    });
  } catch (error) {
    console.error("Error consultando plan PayPal:", getSafePaypalError(error));
    throw new PaypalSubscriptionError(
      "No se pudo validar el plan en PayPal",
      error.response?.status || 502,
      "PAYPAL_PLAN_LOOKUP_FAILED",
    );
  }
};

const getAllowedPlan = async (paypalPlanId) => {
  const plan = await Plan.findOne({
    paypalPlanId,
    estado: ACTIVE_PAYPAL_STATUS,
  });

  if (!plan) {
    throw new PaypalSubscriptionError(
      "El plan de PayPal no esta permitido por el sistema",
      403,
      "PAYPAL_PLAN_NOT_ALLOWED",
    );
  }

  return plan;
};

const validatePaypalPlanMatchesLocalPlan = (paypalPlan, plan) => {
  if (paypalPlan.product_id !== plan.productId) {
    throw new PaypalSubscriptionError(
      "El producto de PayPal no coincide con el plan permitido",
      403,
      "PAYPAL_PRODUCT_MISMATCH",
    );
  }

  if (paypalPlan.status && paypalPlan.status !== ACTIVE_PAYPAL_STATUS) {
    throw new PaypalSubscriptionError(
      "El plan de PayPal no esta activo",
      403,
      "PAYPAL_PLAN_INACTIVE",
    );
  }
};

const assertSubscriptionNotOwnedByAnotherUser = async (subscriptionID, userId) => {
  const existingUser = await Usuario.findOne({
    paypalSubscriptionID: subscriptionID,
  })
    .select("+paypalSubscriptionID")
    .lean();

  if (existingUser && String(existingUser._id) !== String(userId)) {
    throw new PaypalSubscriptionError(
      "La suscripcion ya esta asociada a otro usuario",
      409,
      "PAYPAL_SUBSCRIPTION_REUSED",
    );
  }
};

const validateSubscriptionForUser = async ({ subscription, subscriptionID, userId }) => {
  if (subscription.status !== ACTIVE_PAYPAL_STATUS) {
    throw new PaypalSubscriptionError(
      `Suscripcion no activa: ${subscription.status}`,
      400,
      "PAYPAL_SUBSCRIPTION_NOT_ACTIVE",
    );
  }

  if (String(subscription.custom_id || "") !== String(userId)) {
    throw new PaypalSubscriptionError(
      "La suscripcion de PayPal no pertenece al usuario autenticado",
      403,
      "PAYPAL_CUSTOM_ID_MISMATCH",
    );
  }

  const plan = await getAllowedPlan(subscription.plan_id);
  const paypalPlan = await getPaypalPlanDetails(subscription.plan_id);
  validatePaypalPlanMatchesLocalPlan(paypalPlan, plan);

  const subscriptionStart = parsePaypalDate(
    subscription.start_time,
    "start_time",
  );
  const subscriptionEnd = parsePaypalDate(
    subscription.billing_info?.next_billing_time,
    "billing_info.next_billing_time",
  );

  if (subscriptionEnd <= subscriptionStart) {
    throw new PaypalSubscriptionError(
      "PayPal devolvio fechas de suscripcion inconsistentes",
      400,
      "PAYPAL_DATES_INVALID",
    );
  }

  await assertSubscriptionNotOwnedByAnotherUser(subscriptionID, userId);

  return { plan, subscriptionStart, subscriptionEnd };
};

const applyActiveSubscriptionForUser = async ({
  userId,
  subscriptionID,
  subscription,
}) => {
  const currentUser = await Usuario.findById(userId).select(
    "+paypalSubscriptionID +subscriptionPlanId",
  );

  if (!currentUser) {
    throw new PaypalSubscriptionError(
      "Usuario no encontrado",
      404,
      "USER_NOT_FOUND",
    );
  }

  if (
    currentUser.paypalSubscriptionID &&
    currentUser.paypalSubscriptionID !== subscriptionID
  ) {
    throw new PaypalSubscriptionError(
      "El usuario ya tiene otra suscripcion PayPal asociada",
      409,
      "USER_HAS_OTHER_SUBSCRIPTION",
    );
  }

  const wasAlreadyLinked = currentUser.paypalSubscriptionID === subscriptionID;

  const { plan, subscriptionStart, subscriptionEnd } =
    await validateSubscriptionForUser({
      subscription,
      subscriptionID,
      userId,
    });

  currentUser.suscrito = true;
  currentUser.subscriptionStatus = ACTIVE_PAYPAL_STATUS;
  currentUser.subscriptionStart = subscriptionStart;
  currentUser.subscriptionEnd = subscriptionEnd;
  currentUser.paypalSubscriptionID = subscriptionID;
  currentUser.subscriptionPlanId = plan.paypalPlanId;

  await currentUser.save();

  return {
    idempotent: wasAlreadyLinked,
    subscriptionID,
    paypalStatus: subscription.status,
    plan: serializePlan(plan),
    user: serializeUser(currentUser),
  };
};

const activateSubscriptionForUser = async ({ userId, subscriptionID }) => {
  const subscription = await getSubscriptionDetails(subscriptionID);

  return applyActiveSubscriptionForUser({
    userId,
    subscriptionID,
    subscription,
  });
};

const markSubscriptionInactive = async ({
  subscriptionID,
  status,
  subscriptionEnd,
}) => {
  if (!subscriptionID) return null;

  const user = await Usuario.findOne({ paypalSubscriptionID: subscriptionID })
    .select("+paypalSubscriptionID +subscriptionPlanId");

  if (!user) return null;

  user.suscrito = false;
  user.subscriptionStatus = status;
  if (subscriptionEnd) {
    user.subscriptionEnd = subscriptionEnd;
  }

  await user.save();
  return user;
};

const upsertSubscriptionFromPaypal = async (subscription) => {
  const subscriptionID = subscription.id;
  const customId = subscription.custom_id;

  if (!subscriptionID) {
    throw new PaypalSubscriptionError(
      "PayPal no devolvio ID de suscripcion",
      400,
      "PAYPAL_SUBSCRIPTION_ID_MISSING",
    );
  }

  if (subscription.status === ACTIVE_PAYPAL_STATUS) {
    return applyActiveSubscriptionForUser({
      userId: customId,
      subscriptionID,
      subscription,
    });
  }

  const subscriptionEndValue =
    subscription.billing_info?.next_billing_time ||
    subscription.status_update_time ||
    subscription.update_time ||
    new Date().toISOString();

  const user = await markSubscriptionInactive({
    subscriptionID,
    status: subscription.status || "INACTIVE",
    subscriptionEnd: new Date(subscriptionEndValue),
  });

  return {
    subscriptionID,
    paypalStatus: subscription.status,
    user: user ? serializeUser(user) : null,
  };
};

const getSubscriptionIdFromResource = (resource = {}, eventType = "") =>
  (eventType.startsWith("BILLING.SUBSCRIPTION.") ? resource.id : null) ||
  resource.subscription_id ||
  resource.billing_agreement_id ||
  resource.supplementary_data?.related_ids?.subscription_id ||
  null;

const getPaymentAmount = (resource = {}) => {
  const amount =
    resource.amount ||
    resource.gross_amount ||
    resource.seller_receivable_breakdown?.gross_amount;

  if (!amount) return { value: undefined, currency: undefined };

  return {
    value: Number(amount.value || amount.total),
    currency: amount.currency_code || amount.currency,
  };
};

const recordPaymentFromEvent = async ({ event, subscriptionID, user, plan, estado }) => {
  const resource = event.resource || {};
  const { value, currency } = getPaymentAmount(resource);

  await Pago.findOneAndUpdate(
    { paypalEventId: event.id },
    {
      $setOnInsert: {
        usuario: user?._id,
        plan: plan?._id,
        paypalSubscriptionID: subscriptionID,
        paypalEventId: event.id,
        paypalPaymentId: resource.id || null,
        tipoEvento: event.event_type,
        monto_pagado: Number.isFinite(value) ? value : undefined,
        currency: currency || "USD",
        metodo: "paypal",
        fecha_pago: resource.create_time ? new Date(resource.create_time) : new Date(),
        estado,
        resumen: event.summary || null,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
};

const handlePaymentCompleted = async (event) => {
  const resource = event.resource || {};
  const subscriptionID = getSubscriptionIdFromResource(resource, event.event_type);

  if (!subscriptionID) {
    await recordPaymentFromEvent({ event, estado: "completado" });
    return { processed: true, subscriptionID: null };
  }

  const subscription = await getSubscriptionDetails(subscriptionID);
  const result = await upsertSubscriptionFromPaypal(subscription);
  const user = result.user
    ? await Usuario.findById(result.user._id).select("+subscriptionPlanId")
    : null;
  const plan = subscription.plan_id
    ? await Plan.findOne({ paypalPlanId: subscription.plan_id })
    : null;

  await recordPaymentFromEvent({
    event,
    subscriptionID,
    user,
    plan,
    estado: "completado",
  });

  return { processed: true, subscriptionID };
};

const handlePaymentFailed = async (event) => {
  const subscriptionID = getSubscriptionIdFromResource(
    event.resource || {},
    event.event_type,
  );
  const user = await markSubscriptionInactive({
    subscriptionID,
    status: "PAYMENT_FAILED",
    subscriptionEnd: new Date(),
  });

  await recordPaymentFromEvent({
    event,
    subscriptionID,
    user,
    estado: "fallido",
  });

  return { processed: true, subscriptionID };
};

const handleRefund = async (event) => {
  const subscriptionID = getSubscriptionIdFromResource(
    event.resource || {},
    event.event_type,
  );
  const user = subscriptionID
    ? await Usuario.findOne({ paypalSubscriptionID: subscriptionID })
    : null;

  await recordPaymentFromEvent({
    event,
    subscriptionID,
    user,
    estado: "reembolsado",
  });

  return { processed: true, subscriptionID };
};

const beginWebhookEvent = async (event) => {
  const existingEvent = await PaypalWebhookEvent.findOne({
    paypalEventId: event.id,
  });

  if (existingEvent?.status === "processed") {
    return { duplicate: true, eventLog: existingEvent };
  }

  if (existingEvent) {
    existingEvent.status = "processing";
    existingEvent.errorMessage = null;
    await existingEvent.save();
    return { duplicate: false, eventLog: existingEvent };
  }

  try {
    const eventLog = await PaypalWebhookEvent.create({
      paypalEventId: event.id,
      eventType: event.event_type,
      resourceId: event.resource?.id || null,
      paypalSubscriptionID: getSubscriptionIdFromResource(
        event.resource,
        event.event_type,
      ),
      status: "processing",
      summary: event.summary || null,
    });

    return { duplicate: false, eventLog };
  } catch (error) {
    if (error.code === 11000) {
      return { duplicate: true, eventLog: null };
    }
    throw error;
  }
};

const completeWebhookEvent = async (eventLog, data) => {
  if (!eventLog) return;

  eventLog.status = "processed";
  eventLog.errorMessage = null;
  eventLog.processedAt = new Date();
  if (data?.subscriptionID) {
    eventLog.paypalSubscriptionID = data.subscriptionID;
  }
  await eventLog.save();
};

const failWebhookEvent = async (eventLog, error) => {
  if (!eventLog) return;

  eventLog.status = "failed";
  eventLog.errorMessage = String(error.message || error).slice(0, 300);
  await eventLog.save();
};

const handlePaypalWebhookEvent = async (event) => {
  if (!event?.id || !event?.event_type) {
    throw new PaypalSubscriptionError(
      "Evento PayPal invalido",
      400,
      "PAYPAL_WEBHOOK_INVALID",
    );
  }

  const { duplicate, eventLog } = await beginWebhookEvent(event);
  if (duplicate) {
    return { duplicate: true, processed: true };
  }

  try {
    let result = { processed: false };
    const { event_type: eventType, resource = {} } = event;

    if (
      eventType === "BILLING.SUBSCRIPTION.ACTIVATED" ||
      eventType === "BILLING.SUBSCRIPTION.UPDATED"
    ) {
      const subscriptionID = getSubscriptionIdFromResource(resource, eventType);
      const subscription = await getSubscriptionDetails(subscriptionID);
      result = await upsertSubscriptionFromPaypal(subscription);
    } else if (CANCELLED_EVENT_TYPES.has(eventType)) {
      const subscriptionID = getSubscriptionIdFromResource(resource, eventType);
      const status = eventType.replace("BILLING.SUBSCRIPTION.", "");
      const user = await markSubscriptionInactive({
        subscriptionID,
        status,
        subscriptionEnd: new Date(),
      });
      result = { processed: true, subscriptionID, user: user ? serializeUser(user) : null };
    } else if (PAYMENT_COMPLETED_EVENT_TYPES.has(eventType)) {
      result = await handlePaymentCompleted(event);
    } else if (PAYMENT_FAILED_EVENT_TYPES.has(eventType)) {
      result = await handlePaymentFailed(event);
    } else if (REFUND_EVENT_TYPES.has(eventType)) {
      result = await handleRefund(event);
    } else {
      result = { processed: true, ignored: true };
    }

    await completeWebhookEvent(eventLog, result);
    return result;
  } catch (error) {
    await failWebhookEvent(eventLog, error);
    throw error;
  }
};

const verifyPaypalWebhookSignature = async (headers, event) => {
  if (!process.env.PAYPAL_WEBHOOK_ID) {
    throw new PaypalSubscriptionError(
      "PAYPAL_WEBHOOK_ID no esta configurado",
      500,
      "PAYPAL_WEBHOOK_CONFIG_MISSING",
    );
  }

  const verification = await paypalRequest({
    method: "POST",
    path: "/v1/notifications/verify-webhook-signature",
    data: {
      transmission_id: headers["paypal-transmission-id"],
      transmission_time: headers["paypal-transmission-time"],
      cert_url: headers["paypal-cert-url"],
      auth_algo: headers["paypal-auth-algo"],
      transmission_sig: headers["paypal-transmission-sig"],
      webhook_id: process.env.PAYPAL_WEBHOOK_ID,
      webhook_event: event,
    },
  });

  return verification.verification_status === "SUCCESS";
};

const serializePlan = (plan) => ({
  id: plan.paypalPlanId,
  paypalPlanId: plan.paypalPlanId,
  productId: plan.productId,
  name: plan.nombre,
  description: plan.descripcion,
  status: plan.estado,
  precio: plan.precio,
  currency: plan.currency,
  duracionDias: plan.duracionDias,
  billing_cycles: [
    {
      frequency: {
        interval_unit: plan.intervalUnit,
        interval_count: plan.intervalCount,
      },
      pricing_scheme: {
        fixed_price: {
          value: Number(plan.precio || 0).toFixed(2),
          currency_code: plan.currency || "USD",
        },
      },
    },
  ],
});

const getActivePlansForProduct = async (productId) => {
  const plans = await Plan.find({
    productId,
    estado: ACTIVE_PAYPAL_STATUS,
  })
    .sort({ precio: 1, create_time: -1 })
    .lean();

  return plans.map(serializePlan);
};

const getPublicProductsWithActivePlans = async () => {
  const activeProductIds = await Plan.distinct("productId", {
    estado: ACTIVE_PAYPAL_STATUS,
  });

  if (!activeProductIds.length) return [];

  return Producto.find({
    paypalProductId: { $in: activeProductIds },
  })
    .select("paypalProductId name description type category create_time")
    .sort({ create_time: -1 })
    .lean();
};

module.exports = {
  PaypalSubscriptionError,
  activateSubscriptionForUser,
  getActivePlansForProduct,
  getPublicProductsWithActivePlans,
  getSafePaypalError,
  getSubscriptionDetails,
  handlePaypalWebhookEvent,
  serializePlan,
  verifyPaypalWebhookSignature,
};
