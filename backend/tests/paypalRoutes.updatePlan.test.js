const express = require("express");
const request = require("supertest");

process.env.PAYPAL_API = "https://api-m.sandbox.paypal.com";

jest.mock("axios", () => ({
  default: {
    get: jest.fn(),
    patch: jest.fn(),
    post: jest.fn(),
  },
}));

jest.mock("../middleware/authMiddleware", () => ({
  authenticate: (req, _res, next) => {
    req.user = { rol: "admin" };
    next();
  },
  isAdmin: (_req, _res, next) => next(),
}));

const { default: axios } = require("axios");
const paypalRoutes = require("../routes/paypalRoutes");

const app = express();
app.use(express.json());
app.use("/paypal", paypalRoutes);

describe("edición de planes PayPal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn().mockResolvedValue({
      json: jest.fn().mockResolvedValue({ access_token: "test-token" }),
    });
  });

  test("actualiza nombre, descripción y precio conservando ciclo y moneda", async () => {
    const currentPlan = {
      id: "P-PLAN-A",
      name: "Plan anterior",
      description: "Descripción anterior",
      billing_cycles: [
        {
          tenure_type: "REGULAR",
          sequence: 2,
          pricing_scheme: {
            fixed_price: { value: "8.00", currency_code: "USD" },
          },
        },
      ],
    };
    const updatedPlan = {
      ...currentPlan,
      name: "Plan nuevo",
      description: "Descripción nueva",
      billing_cycles: [
        {
          ...currentPlan.billing_cycles[0],
          pricing_scheme: {
            fixed_price: { value: "12.50", currency_code: "USD" },
          },
        },
      ],
    };

    axios.get
      .mockResolvedValueOnce({ data: currentPlan })
      .mockResolvedValueOnce({ data: updatedPlan });
    axios.patch.mockResolvedValue({ status: 204 });
    axios.post.mockResolvedValue({ status: 204 });

    const response = await request(app)
      .patch("/paypal/planes/P-PLAN-A")
      .send({
        nombre: "Plan nuevo",
        descripcion: "Descripción nueva",
        precio: 12.5,
      });

    expect(response.status).toBe(200);
    expect(response.body.plan).toEqual(updatedPlan);
    expect(axios.patch).toHaveBeenCalledWith(
      "https://api-m.sandbox.paypal.com/v1/billing/plans/P-PLAN-A",
      [
        { op: "replace", path: "/name", value: "Plan nuevo" },
        {
          op: "replace",
          path: "/description",
          value: "Descripción nueva",
        },
      ],
      expect.any(Object),
    );
    expect(axios.post).toHaveBeenCalledWith(
      "https://api-m.sandbox.paypal.com/v1/billing/plans/P-PLAN-A/update-pricing-schemes",
      {
        pricing_schemes: [
          {
            billing_cycle_sequence: 2,
            pricing_scheme: {
              fixed_price: { value: "12.50", currency_code: "USD" },
            },
          },
        ],
      },
      expect.any(Object),
    );
  });

  test("rechaza precios inválidos antes de consultar PayPal", async () => {
    const response = await request(app)
      .patch("/paypal/planes/P-PLAN-A")
      .send({
        nombre: "Plan nuevo",
        descripcion: "Descripción nueva",
        precio: 0,
      });

    expect(response.status).toBe(400);
    expect(axios.get).not.toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test("desactiva un plan en PayPal", async () => {
    axios.post.mockResolvedValue({ status: 204 });

    const response = await request(app).post(
      "/paypal/planes/P-PLAN-A/desactivar",
    );

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Plan desactivado con éxito");
    expect(axios.post).toHaveBeenCalledWith(
      "https://api-m.sandbox.paypal.com/v1/billing/plans/P-PLAN-A/deactivate",
      {},
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer test-token",
        }),
      }),
    );
  });
});
