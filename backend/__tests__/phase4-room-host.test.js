jest.mock("../models/Room", () => ({
  findOne: jest.fn(),
}));

jest.mock("../models/User.js", () => ({
  findById: jest.fn(),
}));

const Room = require("../models/Room");
const {
  verificarHostAutenticadoConSuscripcionActiva,
} = require("../middleware/authMiddleware");

const HOST_ID = "507f1f77bcf86cd799439011";
const OTHER_ID = "507f1f77bcf86cd799439012";

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

describe("autorizacion de host de sala", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("rechaza acciones de host sin usuario autenticado", async () => {
    const req = { body: { roomId: "ROOM1" } };
    const res = createResponse();
    const next = jest.fn();

    await verificarHostAutenticadoConSuscripcionActiva(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test("rechaza a un suscriptor que no es anfitrion de la sala", async () => {
    Room.findOne.mockResolvedValue({ roomId: "ROOM1", host: HOST_ID });
    const req = {
      body: { roomId: "ROOM1" },
      user: {
        _id: OTHER_ID,
        rol: "cantante",
        suscrito: true,
        subscriptionEnd: new Date(Date.now() + 60_000),
      },
    };
    const res = createResponse();
    const next = jest.fn();

    await verificarHostAutenticadoConSuscripcionActiva(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  test("permite al anfitrion con suscripcion activa", async () => {
    Room.findOne.mockResolvedValue({ roomId: "ROOM1", host: HOST_ID });
    const req = {
      body: { roomId: "ROOM1" },
      user: {
        _id: HOST_ID,
        rol: "cantante",
        suscrito: true,
        subscriptionEnd: new Date(Date.now() + 60_000),
      },
    };
    const res = createResponse();
    const next = jest.fn();

    await verificarHostAutenticadoConSuscripcionActiva(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.room).toMatchObject({ roomId: "ROOM1", host: HOST_ID });
  });
});
