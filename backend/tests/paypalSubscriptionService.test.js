const {
  PaypalSubscriptionError,
  createPaypalSubscriptionService,
} = require("../services/paypalSubscriptionService");

describe("paypalSubscriptionService", () => {
  test("crea la suscripción en el servidor y asocia el usuario autenticado", async () => {
    const httpClient = {
      get: jest.fn().mockResolvedValue({
        data: {
          id: "P-ABC123",
          status: "ACTIVE",
          product_id: "PROD-ACTIVE",
        },
      }),
      post: jest.fn().mockResolvedValue({
        data: { id: "I-SUBSCRIPTION-1", status: "APPROVAL_PENDING" },
      }),
    };
    const generateAccessToken = jest.fn().mockResolvedValue("ACCESS-TOKEN");
    const service = createPaypalSubscriptionService({
      apiBaseUrl: "https://api-m.paypal.com",
      generateAccessToken,
      httpClient,
      requestIdFactory: () => "REQUEST-ID-1",
    });

    const result = await service.createSubscription({
      planId: "P-ABC123",
      userId: "USER-123",
      productId: "PROD-ACTIVE",
    });

    expect(result.id).toBe("I-SUBSCRIPTION-1");
    expect(httpClient.post).toHaveBeenCalledWith(
      "https://api-m.paypal.com/v1/billing/subscriptions",
      expect.objectContaining({
        plan_id: "P-ABC123",
        custom_id: "USER-123",
        application_context: expect.objectContaining({
          shipping_preference: "NO_SHIPPING",
          user_action: "SUBSCRIBE_NOW",
        }),
      }),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer ACCESS-TOKEN",
          "PayPal-Request-Id": "REQUEST-ID-1",
        }),
      }),
    );
  });

  test("rechaza un identificador de plan inválido antes de llamar a PayPal", async () => {
    const generateAccessToken = jest.fn();
    const service = createPaypalSubscriptionService({
      apiBaseUrl: "https://api-m.paypal.com",
      generateAccessToken,
    });

    await expect(
      service.createSubscription({ planId: "plan-invalido", userId: "USER" }),
    ).rejects.toEqual(
      expect.objectContaining({
        name: "PaypalSubscriptionError",
        statusCode: 400,
      }),
    );
    expect(generateAccessToken).not.toHaveBeenCalled();
  });

  test("falla de forma explícita si PayPal no devuelve una suscripción", async () => {
    const service = createPaypalSubscriptionService({
      apiBaseUrl: "https://api-m.paypal.com",
      generateAccessToken: jest.fn().mockResolvedValue("ACCESS-TOKEN"),
      httpClient: {
        get: jest.fn().mockResolvedValue({
          data: {
            id: "P-ABC123",
            status: "ACTIVE",
            product_id: "PROD-ACTIVE",
          },
        }),
        post: jest.fn().mockResolvedValue({ data: {} }),
      },
    });

    await expect(
      service.createSubscription({
        planId: "P-ABC123",
        userId: "USER",
        productId: "PROD-ACTIVE",
      }),
    ).rejects.toBeInstanceOf(PaypalSubscriptionError);
  });

  test("rechaza planes que no pertenecen al producto activo", async () => {
    const httpClient = {
      get: jest.fn().mockResolvedValue({
        data: {
          id: "P-ABC123",
          status: "ACTIVE",
          product_id: "PROD-OTHER",
        },
      }),
      post: jest.fn(),
    };
    const service = createPaypalSubscriptionService({
      apiBaseUrl: "https://api-m.paypal.com",
      generateAccessToken: jest.fn().mockResolvedValue("ACCESS-TOKEN"),
      httpClient,
    });

    await expect(
      service.createSubscription({
        planId: "P-ABC123",
        userId: "USER",
        productId: "PROD-ACTIVE",
      }),
    ).rejects.toEqual(
      expect.objectContaining({ statusCode: 400 }),
    );
    expect(httpClient.post).not.toHaveBeenCalled();
  });
});
