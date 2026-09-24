const express = require("express");
const request = require("supertest");
const paypalRoutes = require("../routes/paypalRoutes");

const app = express();
app.use(express.json());
app.use("/paypal", paypalRoutes);

describe("protección de acciones administrativas PayPal", () => {
  test.each([
    ["get", "/paypal/productos"],
    ["get", "/paypal/planes/PROD-A"],
    ["post", "/paypal/crear-producto"],
    ["patch", "/paypal/productos/PROD-A/seleccionar"],
    ["patch", "/paypal/productos/PROD-A/visibilidad"],
    ["post", "/paypal/producto/PROD-A/plan"],
  ])("%s %s requiere autenticación", async (method, path) => {
    const response = await request(app)[method](path).send({});

    expect(response.status).toBe(401);
  });
});
