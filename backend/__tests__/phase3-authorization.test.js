const express = require("express");
const jwt = require("jsonwebtoken");
const request = require("supertest");

jest.mock("../models/User.js", () => ({
  findById: jest.fn(),
}));

jest.mock("../models/SolicitudCancion", () => {
  const SolicitudCancion = jest.fn(function MockSolicitud(data) {
    Object.assign(this, data);
    this.votos = this.votos || [];
    this.save = jest.fn().mockResolvedValue(this);
  });

  SolicitudCancion.findOneAndUpdate = jest.fn();
  SolicitudCancion.exists = jest.fn();
  SolicitudCancion.findById = jest.fn();
  SolicitudCancion.deleteOne = jest.fn();

  return SolicitudCancion;
});

const User = require("../models/User.js");
const SolicitudCancion = require("../models/SolicitudCancion");
const solicitudController = require("../controllers/solicitudCancionController");
const createListController = require("../controllers/listController");

const AUTH_USER_ID = "507f1f77bcf86cd799439011";
const OTHER_USER_ID = "507f1f77bcf86cd799439012";

const selectResolved = (value) => ({
  select: jest.fn().mockResolvedValue(value),
});

const createResponse = () => {
  const res = {};
  res.status = jest.fn((statusCode) => {
    res.statusCode = statusCode;
    return res;
  });
  res.json = jest.fn((payload) => {
    res.payload = payload;
    return res;
  });
  return res;
};

const normalUserToken = () =>
  jwt.sign(
    { userId: AUTH_USER_ID, tokenVersion: 0, type: "access" },
    process.env.JWT_SECRET,
  );

describe("roles y autorizacion", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = "test-secret";
    User.findById.mockReturnValue(
      selectResolved({
        _id: AUTH_USER_ID,
        id: AUTH_USER_ID,
        rol: "cantante",
        tokenVersion: 0,
        suscrito: true,
        subscriptionEnd: new Date(Date.now() + 60_000),
      }),
    );
  });

  test("crear canciones es solo admin", async () => {
    const app = express();
    app.use(express.json());
    app.use("/", require("../routes/cancionRoutes"));

    const response = await request(app)
      .post("/")
      .set("Authorization", `Bearer ${normalUserToken()}`)
      .send({ titulo: "Nope" });

    expect(response.status).toBe(403);
  });

  test("eliminar todas las solicitudes es solo admin", async () => {
    const app = express();
    app.use(express.json());
    app.use("/", require("../routes/solicitudCancionRoutes"));

    const response = await request(app)
      .delete("/all")
      .set("Authorization", `Bearer ${normalUserToken()}`);

    expect(response.status).toBe(403);
  });

  test("configurar puntajes es solo admin", async () => {
    const app = express();
    app.use(express.json());
    app.use("/", require("../routes/PuntajeRoutes"));

    const response = await request(app)
      .post("/puntaje/")
      .set("Authorization", `Bearer ${normalUserToken()}`)
      .send({ calificacion: "A", weight: 10 });

    expect(response.status).toBe(403);
  });

  test("crear solicitud usa el usuario autenticado, no el usuario del body", async () => {
    const req = {
      user: { _id: AUTH_USER_ID },
      body: {
        usuario: OTHER_USER_ID,
        cantante: "Singer",
        cancion: "Song",
      },
    };
    const res = createResponse();

    await solicitudController.crearSolicitud(req, res);

    expect(SolicitudCancion).toHaveBeenCalledWith(
      expect.objectContaining({
        usuario: AUTH_USER_ID,
        cantante: "Singer",
        cancion: "Song",
      }),
    );
    expect(res.status).toHaveBeenCalledWith(201);
  });

  test("votar solicitud usa req.user._id y addToSet atomico", async () => {
    SolicitudCancion.findOneAndUpdate.mockResolvedValue({
      votos: [AUTH_USER_ID],
    });
    const req = {
      user: { _id: AUTH_USER_ID },
      params: { id: "solicitud-id" },
      body: { usuario: OTHER_USER_ID },
    };
    const res = createResponse();

    await solicitudController.votarPorSolicitud(req, res);

    expect(SolicitudCancion.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: "solicitud-id", votos: { $ne: AUTH_USER_ID } },
      { $addToSet: { votos: AUTH_USER_ID } },
      { new: true },
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test("listas ignoran userId arbitrario al consultar favoritos", async () => {
    const populate = jest.fn().mockResolvedValue(null);
    const Model = {
      findOne: jest.fn(() => ({ populate })),
    };
    const controller = createListController(Model);
    const req = {
      user: { _id: AUTH_USER_ID, rol: "cantante" },
      params: { userId: OTHER_USER_ID },
    };
    const res = createResponse();

    await controller.getList(req, res);

    expect(Model.findOne).toHaveBeenCalledWith({ user: AUTH_USER_ID });
    expect(res.payload).toEqual({ canciones: [] });
  });

  test("listas verifican propietario antes de leer una playlist", async () => {
    const populate = jest.fn().mockResolvedValue({ nombre: "Mine", canciones: [] });
    const Model = {
      findOne: jest.fn(() => ({ populate })),
    };
    const controller = createListController(Model);
    const req = {
      user: { _id: AUTH_USER_ID, rol: "cantante" },
      params: { playlistId: "playlist-id" },
    };
    const res = createResponse();

    await controller.getCancionesDePlaylist(req, res);

    expect(Model.findOne).toHaveBeenCalledWith({
      _id: "playlist-id",
      user: AUTH_USER_ID,
    });
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
