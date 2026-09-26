const {
  buildSubscriptionUpdate,
  createPaypalWebhookService,
  getSubscriptionId,
} = require("../services/paypalWebhookService");

describe("webhooks de suscripciones PayPal", () => {
  const subscription = {
    id: "I-SUBSCRIPTION-1",
    custom_id: "507f1f77bcf86cd799439011",
    status: "ACTIVE",
    start_time: "2026-09-01T00:00:00Z",
    billing_info: {
      next_billing_time: "2026-11-01T00:00:00Z",
    },
  };

  test("extrae el ID de suscripción de un pago completado", () => {
    expect(
      getSubscriptionId({
        event_type: "PAYMENT.SALE.COMPLETED",
        resource: { billing_agreement_id: subscription.id },
      }),
    ).toBe(subscription.id);
  });

  test("un pago completado habilita y extiende la suscripción", () => {
    const update = buildSubscriptionUpdate(
      {
        id: "WH-PAID-1",
        event_type: "PAYMENT.SALE.COMPLETED",
        create_time: "2026-10-01T00:00:00Z",
        resource: {
          billing_agreement_id: subscription.id,
          create_time: "2026-10-01T00:00:00Z",
        },
      },
      subscription,
    );

    expect(update).toEqual(
      expect.objectContaining({
        suscrito: true,
        paypalSubscriptionID: subscription.id,
        paypalSubscriptionStatus: "ACTIVE",
        paypalLastPaymentStatus: "COMPLETED",
        lastPaypalWebhookEventId: "WH-PAID-1",
        subscriptionEnd: new Date("2026-11-01T00:00:00Z"),
      }),
    );
  });

  test("un pago fallido no corta un periodo que todavía está pagado", () => {
    const update = buildSubscriptionUpdate(
      {
        id: "WH-FAILED-1",
        event_type: "BILLING.SUBSCRIPTION.PAYMENT.FAILED",
        create_time: "2026-10-01T00:00:00Z",
        resource: { id: subscription.id },
      },
      subscription,
      new Date("2026-10-15T00:00:00Z"),
      new Date("2026-10-20T00:00:00Z"),
      true,
    );

    expect(update.suscrito).toBe(true);
    expect(update.paypalLastPaymentStatus).toBe("FAILED");
  });

  test("un primer pago fallido no concede acceso", () => {
    const update = buildSubscriptionUpdate(
      {
        id: "WH-FAILED-INITIAL",
        event_type: "BILLING.SUBSCRIPTION.PAYMENT.FAILED",
        resource: { id: subscription.id },
      },
      subscription,
      new Date("2026-10-15T00:00:00Z"),
      new Date("2026-11-01T00:00:00Z"),
      false,
    );

    expect(update.suscrito).toBe(false);
  });

  test("verifica la firma y procesa el evento una sola vez", async () => {
    const httpClient = {
      post: jest.fn().mockResolvedValue({
        data: { verification_status: "SUCCESS" },
      }),
      get: jest.fn().mockResolvedValue({ data: subscription }),
    };
    const user = {
      _id: subscription.custom_id,
      lastPaypalWebhookEventId: null,
    };
    const UserModel = {
      findOne: jest.fn().mockResolvedValue(user),
      updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
    };
    const generateAccessToken = jest.fn().mockResolvedValue("access-token");
    const service = createPaypalWebhookService({
      apiBaseUrl: "https://api-m.sandbox.paypal.com",
      webhookId: "WEBHOOK-123",
      generateAccessToken,
      UserModel,
      httpClient,
    });
    const headers = {
      "paypal-transmission-id": "transmission-id",
      "paypal-transmission-time": "2026-10-01T00:00:00Z",
      "paypal-cert-url": "https://api-m.paypal.com/cert",
      "paypal-auth-algo": "SHA256withRSA",
      "paypal-transmission-sig": "signature",
    };
    const event = {
      id: "WH-PAID-2",
      event_type: "PAYMENT.SALE.COMPLETED",
      resource: { billing_agreement_id: subscription.id },
    };

    await expect(service.verifyWebhook(headers, event)).resolves.toBe(true);
    await expect(service.processEvent(event)).resolves.toEqual(
      expect.objectContaining({
        handled: true,
        subscriptionId: subscription.id,
      }),
    );

    expect(httpClient.post).toHaveBeenCalledWith(
      "https://api-m.sandbox.paypal.com/v1/notifications/verify-webhook-signature",
      expect.objectContaining({
        webhook_id: "WEBHOOK-123",
        webhook_event: event,
      }),
      expect.any(Object),
    );
    expect(UserModel.updateOne).toHaveBeenCalledWith(
      expect.objectContaining({ _id: user._id }),
      {
        $set: expect.objectContaining({
          suscrito: true,
          paypalLastPaymentStatus: "COMPLETED",
        }),
      },
    );
  });
});
