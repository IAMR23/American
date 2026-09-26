const axios = require("axios");

const SUCCESSFUL_PAYMENT_EVENTS = new Set([
  "PAYMENT.SALE.COMPLETED",
  "BILLING.SUBSCRIPTION.PAYMENT.SUCCEEDED",
]);

const FAILED_PAYMENT_EVENTS = new Set([
  "BILLING.SUBSCRIPTION.PAYMENT.FAILED",
]);

const REVOKED_PAYMENT_EVENTS = new Set([
  "PAYMENT.SALE.REFUNDED",
  "PAYMENT.SALE.REVERSED",
]);

const SUBSCRIPTION_EVENTS = new Set([
  "BILLING.SUBSCRIPTION.CREATED",
  "BILLING.SUBSCRIPTION.ACTIVATED",
  "BILLING.SUBSCRIPTION.UPDATED",
  "BILLING.SUBSCRIPTION.CANCELLED",
  "BILLING.SUBSCRIPTION.SUSPENDED",
  "BILLING.SUBSCRIPTION.EXPIRED",
]);

const SUPPORTED_EVENTS = new Set([
  ...SUCCESSFUL_PAYMENT_EVENTS,
  ...FAILED_PAYMENT_EVENTS,
  ...REVOKED_PAYMENT_EVENTS,
  ...SUBSCRIPTION_EVENTS,
]);

function getSubscriptionId(event) {
  const resource = event?.resource || {};

  return (
    resource.billing_agreement_id ||
    resource.supplementary_data?.related_ids?.subscription_id ||
    (String(event?.event_type || "").startsWith("BILLING.SUBSCRIPTION.")
      ? resource.id
      : null)
  );
}

function validDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getSubscriptionDates(subscription) {
  return {
    start: validDate(subscription?.start_time),
    end: validDate(subscription?.billing_info?.next_billing_time),
  };
}

function buildSubscriptionUpdate(
  event,
  subscription,
  now = new Date(),
  currentSubscriptionEnd = null,
  currentSubscribed = false,
) {
  const eventType = event.event_type;
  const dates = getSubscriptionDates(subscription);
  const update = {
    paypalSubscriptionID: subscription.id,
    paypalSubscriptionStatus: subscription.status || null,
    lastPaypalWebhookEventId: event.id,
    lastPaypalWebhookEventAt: validDate(event.create_time) || now,
  };

  if (dates.start) update.subscriptionStart = dates.start;

  if (SUCCESSFUL_PAYMENT_EVENTS.has(eventType)) {
    if (dates.end) update.subscriptionEnd = dates.end;
    update.suscrito = true;
    update.paypalLastPaymentStatus = "COMPLETED";
    update.paypalLastPaymentAt =
      validDate(event.resource?.create_time) ||
      validDate(event.create_time) ||
      now;
  } else if (FAILED_PAYMENT_EVENTS.has(eventType)) {
    const paidUntil = validDate(currentSubscriptionEnd);
    update.paypalLastPaymentStatus = "FAILED";
    update.paypalLastPaymentAt = validDate(event.create_time) || now;
    update.suscrito = Boolean(
      currentSubscribed && paidUntil && paidUntil > now,
    );
  } else if (REVOKED_PAYMENT_EVENTS.has(eventType)) {
    update.suscrito = false;
    update.paypalLastPaymentStatus = eventType.endsWith("REFUNDED")
      ? "REFUNDED"
      : "REVERSED";
    update.paypalLastPaymentAt = validDate(event.create_time) || now;
  } else if (
    eventType === "BILLING.SUBSCRIPTION.SUSPENDED" ||
    eventType === "BILLING.SUBSCRIPTION.EXPIRED"
  ) {
    update.suscrito = false;
  } else if (eventType === "BILLING.SUBSCRIPTION.CANCELLED") {
    if (dates.end) update.subscriptionEnd = dates.end;
    update.suscrito = Boolean(
      currentSubscribed && dates.end && dates.end > now,
    );
  } else if (SUBSCRIPTION_EVENTS.has(eventType) && dates.end) {
    update.subscriptionEnd = dates.end;
  }

  return update;
}

function isMongoId(value) {
  return /^[a-f\d]{24}$/i.test(String(value || ""));
}

function createPaypalWebhookService({
  apiBaseUrl,
  webhookId,
  generateAccessToken,
  UserModel,
  httpClient = axios,
}) {
  async function verifyWebhook(headers, event) {
    if (!webhookId) {
      throw new Error("PAYPAL_WEBHOOK_ID no está configurado");
    }

    const verificationFields = {
      transmission_id: headers["paypal-transmission-id"],
      transmission_time: headers["paypal-transmission-time"],
      cert_url: headers["paypal-cert-url"],
      auth_algo: headers["paypal-auth-algo"],
      transmission_sig: headers["paypal-transmission-sig"],
    };

    if (Object.values(verificationFields).some((value) => !value)) {
      return false;
    }

    const accessToken = await generateAccessToken();
    const response = await httpClient.post(
      `${apiBaseUrl}/v1/notifications/verify-webhook-signature`,
      {
        ...verificationFields,
        webhook_id: webhookId,
        webhook_event: event,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      },
    );

    return response.data?.verification_status === "SUCCESS";
  }

  async function getSubscriptionDetails(subscriptionId) {
    const accessToken = await generateAccessToken();
    const response = await httpClient.get(
      `${apiBaseUrl}/v1/billing/subscriptions/${subscriptionId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      },
    );

    return response.data;
  }

  async function processEvent(event) {
    if (!SUPPORTED_EVENTS.has(event?.event_type)) {
      return { handled: false, reason: "unsupported-event" };
    }

    const subscriptionId = getSubscriptionId(event);
    if (!subscriptionId) {
      return { handled: false, reason: "missing-subscription-id" };
    }

    const subscription = await getSubscriptionDetails(subscriptionId);
    const userFilters = [{ paypalSubscriptionID: subscriptionId }];

    if (isMongoId(subscription.custom_id)) {
      userFilters.push({ _id: subscription.custom_id });
    }

    const user = await UserModel.findOne({ $or: userFilters });
    if (!user) {
      return { handled: false, reason: "user-not-found", subscriptionId };
    }

    if (user.lastPaypalWebhookEventId === event.id) {
      return { handled: true, duplicate: true, subscriptionId };
    }

    const eventTime = validDate(event.create_time);
    const lastEventTime = validDate(user.lastPaypalWebhookEventAt);
    if (eventTime && lastEventTime && eventTime < lastEventTime) {
      return { handled: true, stale: true, subscriptionId };
    }

    const update = buildSubscriptionUpdate(
      event,
      subscription,
      new Date(),
      user.subscriptionEnd,
      user.suscrito,
    );
    await UserModel.updateOne(
      {
        _id: user._id,
        lastPaypalWebhookEventId: { $ne: event.id },
      },
      { $set: update },
    );

    return { handled: true, subscriptionId, userId: String(user._id) };
  }

  return {
    verifyWebhook,
    getSubscriptionDetails,
    processEvent,
  };
}

module.exports = {
  SUPPORTED_EVENTS,
  buildSubscriptionUpdate,
  createPaypalWebhookService,
  getSubscriptionId,
};
