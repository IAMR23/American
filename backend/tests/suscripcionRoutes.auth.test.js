const express = require("express");
const request = require("supertest");
const suscripcionRoutes = require("../routes/suscripcionRoutes");

const app = express();
app.use(express.json());
app.use("/suscripcion", suscripcionRoutes);

describe("protección de la asociación de suscripciones", () => {
  test("crear-suscripcion requiere autenticación", async () => {
    const response = await request(app)
      .post("/suscripcion/crear-suscripcion")
      .send({ planId: "P-ABC123" });

    expect(response.status).toBe(401);
  });

  test("activar-suscripcion requiere autenticación", async () => {
    const response = await request(app)
      .post("/suscripcion/activar-suscripcion")
      .send({ subscriptionID: "I-SUBSCRIPTION-1" });

    expect(response.status).toBe(401);
  });
});
