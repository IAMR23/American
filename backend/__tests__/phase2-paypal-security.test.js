const express = require("express");
const jwt = require("jsonwebtoken");
const request = require("supertest");

jest.mock("axios", () => jest.fn());

jest.mock("../paypal", () => ({
  generateAccessToken: jest.fn(async () => "paypal-access-token"),
}));

jest.mock("../models/User.js", () => ({
  findById: jest.fn(),
  findOne: jest.fn(),
}));

jest.mock("../models/Plan", () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  distinct: jest.fn(),
}));

jest.mock("../models/Producto", () => ({
  find: jest.fn(),
}));

jest.mock("../models/Pago", () => ({
  findOneAndUpdate: jest.fn(),
}));

jest.mock("../models/PaypalWebhookEvent", () => ({
  findOne: jest.fn(),
  create: jest.fn(),
}));

const axios = require("axios");
const Usuario = require("../models/User.js");
const Plan = require("../models/Plan");
const Pago = require("../models/Pago");
const PaypalWebhookEvent = require("../models/PaypalWebhookEvent");
const {
  activateSubscriptionForUser,
  handlePaypalWebhookEvent,
} = require("../services/paypalSubscriptionService");

const AUTH_USER_ID = "507f1f77bcf86cd799439011";
const OTHER_USER_ID = "507f1f77bcf86cd799439012";

const selectResolved = (value) => ({
  select: jest.fn().mockResolvedValue(value),
});

const selectLeanResolved = (value) => ({
  select: jest.fn(() => ({
    lean: jest.fn().mockResolvedValue(value),
  })),
});

const createUserDoc = (overrides = {}) => {
  const user = {
    _id: AUTH_USER_ID,
    rol: "cantante",
    tokenVersion: 0,
    suscrito: false,
    subscriptionStatus: "INACTIVE",
    subscriptionStart: null,
    subscriptionEnd: null,
    paypalSubscriptionID: null,
    subscriptionPlanId: null,
    ...overrides,
  };
  user.save = jest.fn().mockResolvedValue(user);
  return user;
};

const createEventLog = () => {
  const eventLog = {
    status: "processing",
    save: jest.fn().mockResolvedValue(null),
  };
  eventLog.save.mockResolvedValue(eventLog);
  return eventLog;
};

const paypalSubscription = (overrides = {}) => ({
  id: "I-SUBSCRIPTION",
  status: "ACTIVE",
  custom_id: AUTH_USER_ID,
  plan_id: "P-PLAN",
  start_time: "2026-08-01T00:00:00.000Z",
  billing_info: {
    next_billing_time: "2026-09-01T00:00:00.000Z",
  },
  ...overrides,
});

const localPlan = {
  _id: "local-plan-id",
  paypalPlanId: "P-PLAN",
  productId: "PROD-1",
  nombre: "Mensual",
  descripcion: "Plan mensual",
  precio: 9.99,
  currency: "USD",
  duracionDias: 30,
  intervalUnit: "MONTH",
  intervalCount: 1,
  estado: "ACTIVE",
};

describe("seguridad PayPal y suscripciones", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = "test-secret";
    process.env.PAYPAL_API = "https://api-m.sandbox.paypal.com";
  });

  test("POST /activar-suscripcion requiere autenticacion", async () => {
    const app = express();
    app.use(express.json());
    app.use("/", require("../routes/suscripcionRoutes"));

    const response = await request(app)
      .post("/activar-suscripcion")
      .send({ subscriptionID: "I-SUBSCRIPTION" });

    expect(response.status).toBe(401);
  });

  test("activar-suscripcion usa req.user._id e ignora userId del body", async () => {
    const user = createUserDoc();
    Usuario.findById
      .mockReturnValueOnce(selectResolved({ _id: AUTH_USER_ID, rol: "cantante", tokenVersion: 0 }))
      .mockReturnValueOnce(selectResolved(user));
    Usuario.findOne.mockReturnValue(selectLeanResolved(null));
    Plan.findOne.mockResolvedValue(localPlan);
    axios
      .mockResolvedValueOnce({ data: paypalSubscription() })
      .mockResolvedValueOnce({
        data: { id: "P-PLAN", product_id: "PROD-1", status: "ACTIVE" },
      });

    const token = jwt.sign(
      { userId: AUTH_USER_ID, tokenVersion: 0, type: "access" },
      process.env.JWT_SECRET,
    );
    const app = express();
    app.use(express.json());
    app.use("/", require("../routes/suscripcionRoutes"));

    const response = await request(app)
      .post("/activar-suscripcion")
      .set("Authorization", `Bearer ${token}`)
      .send({
        userId: OTHER_USER_ID,
        subscriptionID: "I-SUBSCRIPTION",
      });

    expect(response.status).toBe(200);
    expect(user.paypalSubscriptionID).toBe("I-SUBSCRIPTION");
    expect(user.suscrito).toBe(true);
    expect(response.body.user._id).toBe(AUTH_USER_ID);
  });

  test("una suscripcion PayPal no puede reutilizarse para otro usuario", async () => {
    const user = createUserDoc();
    Usuario.findById.mockReturnValue(selectResolved(user));
    Usuario.findOne.mockReturnValue(selectLeanResolved({ _id: OTHER_USER_ID }));
    Plan.findOne.mockResolvedValue(localPlan);
    axios
      .mockResolvedValueOnce({ data: paypalSubscription() })
      .mockResolvedValueOnce({
        data: { id: "P-PLAN", product_id: "PROD-1", status: "ACTIVE" },
      });

    await expect(
      activateSubscriptionForUser({
        userId: AUTH_USER_ID,
        subscriptionID: "I-SUBSCRIPTION",
      }),
    ).rejects.toMatchObject({
      code: "PAYPAL_SUBSCRIPTION_REUSED",
      statusCode: 409,
    });
    expect(user.save).not.toHaveBeenCalled();
  });

  test("webhook PAYMENT.SALE.COMPLETED renueva estado y registra pago", async () => {
    const user = createUserDoc({ paypalSubscriptionID: "I-SUBSCRIPTION" });
    const eventLog = createEventLog();
    PaypalWebhookEvent.findOne.mockResolvedValue(null);
    PaypalWebhookEvent.create.mockResolvedValue(eventLog);
    Usuario.findById
      .mockReturnValueOnce(selectResolved(user))
      .mockReturnValueOnce(selectResolved(user));
    Usuario.findOne.mockReturnValue(selectLeanResolved(null));
    Plan.findOne.mockResolvedValue(localPlan);
    Pago.findOneAndUpdate.mockResolvedValue({});
    axios
      .mockResolvedValueOnce({ data: paypalSubscription() })
      .mockResolvedValueOnce({
        data: { id: "P-PLAN", product_id: "PROD-1", status: "ACTIVE" },
      });

    const result = await handlePaypalWebhookEvent({
      id: "WH-1",
      event_type: "PAYMENT.SALE.COMPLETED",
      summary: "Subscription payment completed",
      resource: {
        id: "PAY-1",
        billing_agreement_id: "I-SUBSCRIPTION",
        amount: { total: "9.99", currency: "USD" },
        create_time: "2026-08-16T00:00:00.000Z",
      },
    });

    expect(result).toMatchObject({ processed: true, subscriptionID: "I-SUBSCRIPTION" });
    expect(user.suscrito).toBe(true);
    expect(user.subscriptionEnd).toEqual(new Date("2026-09-01T00:00:00.000Z"));
    expect(Pago.findOneAndUpdate).toHaveBeenCalledWith(
      { paypalEventId: "WH-1" },
      expect.objectContaining({
        $setOnInsert: expect.objectContaining({
          paypalSubscriptionID: "I-SUBSCRIPTION",
          paypalEventId: "WH-1",
          paypalPaymentId: "PAY-1",
          estado: "completado",
        }),
      }),
      expect.any(Object),
    );
    expect(eventLog.status).toBe("processed");
  });

  test("webhook ya procesado es idempotente y no vuelve a tocar usuarios", async () => {
    PaypalWebhookEvent.findOne.mockResolvedValue({
      status: "processed",
      save: jest.fn(),
    });

    const result = await handlePaypalWebhookEvent({
      id: "WH-DUP",
      event_type: "BILLING.SUBSCRIPTION.CANCELLED",
      resource: { id: "I-SUBSCRIPTION" },
    });

    expect(result).toEqual({ duplicate: true, processed: true });
    expect(Usuario.findOne).not.toHaveBeenCalled();
  });
});
