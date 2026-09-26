const express = require("express");
const request = require("supertest");
const suscripcionRoutes = require("../routes/suscripcionRoutes");

const app = express();
app.use(express.json());
app.use("/suscripcion", suscripcionRoutes);

describe("protección de la asociación de suscripciones", () => {
  test("activar-suscripcion requiere autenticación", async () => {
    const response = await request(app)
      .post("/suscripcion/activar-suscripcion")
      .send({ subscriptionID: "I-SUBSCRIPTION-1" });

    expect(response.status).toBe(401);
  });
});
