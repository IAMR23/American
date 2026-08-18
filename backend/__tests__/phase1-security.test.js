const express = require("express");
const jwt = require("jsonwebtoken");
const request = require("supertest");

jest.mock("bcrypt", () => ({
  hash: jest.fn(async () => "hashed-password"),
}));

jest.mock("../models/User.js", () => {
  const User = jest.fn(function MockUser(data) {
    Object.assign(this, data);
    this._id = "created-user-id";
    this.save = jest.fn().mockResolvedValue(this);
  });

  User.findOne = jest.fn();
  User.findById = jest.fn();
  User.find = jest.fn();
  User.findByIdAndDelete = jest.fn();

  return User;
});

const User = require("../models/User.js");
const { createUser, getUsers } = require("../controllers/userController");
const { resetPassword } = require("../middleware/resetPassword");
const { serializeUser } = require("../utils/userSecurity");

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
  res.set = jest.fn(() => res);
  return res;
};

describe("seguridad critica de usuarios", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = "test-secret";
  });

  test("el registro publico ignora rol y suscripcion enviados por el cliente", async () => {
    User.findOne.mockResolvedValue(null);
    const req = {
      body: {
        nombre: "  Test User  ",
        email: " TEST@EXAMPLE.COM ",
        password: "Strong1!",
        rol: "admin",
        suscrito: true,
        subscriptionStart: "2026-01-01",
        subscriptionEnd: "2027-01-01",
      },
    };
    const res = createResponse();

    await createUser(req, res);

    expect(User).toHaveBeenCalledWith(
      expect.objectContaining({
        nombre: "Test User",
        email: "test@example.com",
        rol: "cantante",
        suscrito: false,
        subscriptionStart: null,
        subscriptionEnd: null,
      }),
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.payload.user).toMatchObject({
      nombre: "Test User",
      email: "test@example.com",
      rol: "cantante",
      suscrito: false,
      subscriptionStart: null,
      subscriptionEnd: null,
    });
    expect(res.payload.user.password).toBeUndefined();
    expect(res.payload.user.resetToken).toBeUndefined();
    expect(res.payload.user.resetTokenExpire).toBeUndefined();
    expect(res.payload.user.tokenVersion).toBeUndefined();
  });

  test("serializeUser no devuelve campos internos", () => {
    const safe = serializeUser({
      _id: "user-id",
      nombre: "User",
      email: "user@example.com",
      rol: "cantante",
      suscrito: true,
      subscriptionStart: null,
      subscriptionEnd: new Date("2026-12-31T00:00:00.000Z"),
      password: "hash",
      resetToken: "token",
      resetTokenExpire: new Date(),
      tokenVersion: 3,
      paypalSubscriptionID: "I-SENSITIVE",
    });

    expect(safe).toEqual({
      _id: "user-id",
      nombre: "User",
      email: "user@example.com",
      rol: "cantante",
      suscrito: true,
      subscriptionStart: null,
      subscriptionEnd: new Date("2026-12-31T00:00:00.000Z"),
      subscriptionStatus: undefined,
      createdAt: undefined,
      updatedAt: undefined,
    });
  });

  test("GET /users no es publico", async () => {
    const app = express();
    app.use(express.json());
    app.use("/", require("../routes/UserRoutes"));

    const response = await request(app).get("/users");

    expect(response.status).toBe(401);
  });

  test("un usuario normal no puede editar ni eliminar usuarios", async () => {
    const app = express();
    app.use(express.json());
    app.use("/", require("../routes/UserRoutes"));

    const token = jwt.sign(
      { userId: "507f1f77bcf86cd799439011", tokenVersion: 0, type: "access" },
      process.env.JWT_SECRET,
    );
    const query = {
      select: jest.fn().mockResolvedValue({
        _id: "507f1f77bcf86cd799439011",
        rol: "cantante",
        tokenVersion: 0,
      }),
    };
    User.findById.mockReturnValue(query);

    const patchResponse = await request(app)
      .patch("/users/507f1f77bcf86cd799439012")
      .set("Authorization", `Bearer ${token}`)
      .send({ rol: "admin" });
    const deleteResponse = await request(app)
      .delete("/user/507f1f77bcf86cd799439012")
      .set("Authorization", `Bearer ${token}`);

    expect(patchResponse.status).toBe(403);
    expect(deleteResponse.status).toBe(403);
  });

  test("GET /users serializa la lista sin passwords ni tokens", async () => {
    const lean = jest.fn().mockResolvedValue([
      {
        _id: "user-id",
        nombre: "Admin",
        email: "admin@example.com",
        rol: "admin",
        suscrito: true,
        password: "hash",
        resetToken: "token",
        resetTokenExpire: new Date(),
        tokenVersion: 1,
      },
    ]);
    const sort = jest.fn(() => ({ lean }));
    User.find.mockReturnValue({ sort });
    const req = {};
    const res = createResponse();

    await getUsers(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.payload.user).toHaveLength(1);
    expect(res.payload.user[0].password).toBeUndefined();
    expect(res.payload.user[0].resetToken).toBeUndefined();
    expect(res.payload.user[0].resetTokenExpire).toBeUndefined();
    expect(res.payload.user[0].tokenVersion).toBeUndefined();
  });

  test("resetPassword rechaza passwords debiles antes de consultar Mongo", async () => {
    const req = { body: { token: "valid-token", newPassword: "weak" } };
    const res = createResponse();

    await resetPassword(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(User.findOne).not.toHaveBeenCalled();
  });
});
