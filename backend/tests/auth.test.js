const request = require("supertest");
const { connect, closeDatabase, clearDatabase } = require("./dbHandler");
const UserModel = require("../models/user");
const bcrypt = require("bcrypt");
const app = require("../app");

beforeAll(async () => await connect());
afterEach(async () => await clearDatabase());
afterAll(async () => await closeDatabase());

describe("Auth API Tests", () => {
  // register new user
  test("should signup a new user successfully", async () => {
    const res = await request(app).post("/api/auth/signup").send({
      firstname: "Rohit",
      lastname: "Vishwakarma",
      email: "rohit@example.com",
      password: "123456",
      role: "user",
    });

    expect(res.statusCode).toBe(201);
    expect(res.body.message).toBe("Signup Success");

    const user = await UserModel.findOne({ email: "rohit@example.com" });
    expect(user).not.toBeNull();
  });
  // register existing user
  test("should not signup if email already exists", async () => {
    await UserModel.create({
      firstname: "Rohit",
      lastname: "Vishwakarma",
      email: "rohit@example.com",
      password: "hashedpass",
    });

    const res = await request(app).post("/api/auth/signup").send({
      firstname: "Rohit",
      lastname: "Vishwakarma",
      email: "rohit@example.com",
      password: "123456",
    });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe("User with this email already exists");
  });

  //   Signup with invalid data
  it("should fail when email is invalid", async () => {
    const response = await request(app).post("/api/auth/signup").send({
      firstname: "Rohit",
      lastname: "Vishwakarma",
      email: "notanemail",
      password: "123",
    });

    expect(response.statusCode).toBe(400);
    expect(response.body.message).toMatch(/Invalid email format/i);
  });

  //   Missing required fields
  it("should fail when required fields are missing", async () => {
    const response = await request(app).post("/api/auth/signup").send({
      email: "rohit2@example.com",
      // missing password
    });

    expect(response.statusCode).toBe(400);
    expect(response.body.message).toMatch(/missing/i);
  });

  //    Weak password (less than 6 chars)
  it("should fail with weak password", async () => {
    const response = await request(app).post("/api/auth/signup").send({
      firstname: "Rohit",
      lastname: "Vishwakarma",
      email: "weakpass@example.com",
      password: "123",
    });

    expect(response.statusCode).toBe(400);
    expect(response.body.message).toMatch(/password/i);
  });

  //   Check no sensitive data returned
  it("should not return password or sensitive info", async () => {
    const response = await request(app).post("/api/auth/signup").send({
      firstname: "Rohit",
      lastname: "Vishwakarma",
      email: "noleak@example.com",
      password: "password123",
    });

    expect(response.statusCode).toBe(201);
    expect(response.body.password).toBeUndefined();
  });

  //  Test Login Success
  it("should login an existing user successfully", async () => {
    const hashedPassword = await bcrypt.hash("password123", 10);
    await UserModel.create({
      firstname: "Rohit",
      lastname: "Vishwakarma",
      email: "rohitlogin@example.com",
      password: hashedPassword,
    });

    const response = await request(app).post("/api/auth/login").send({
      email: "rohitlogin@example.com",
      password: "password123",
    });

    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe("Login Success");
    expect(response.body.accessToken).toBeDefined();
    expect(response.body.refreshToken).toBeDefined();
  });

  //  Test Login failure - wrong password
  it("should fail login with wrong password", async () => {
    const hashedPassword =
      "$2b$10$ixgAmcsx7CvOkXAXvwN3ze3sTmqhtrV1e8HjftjYr94hWOGvdNw5O";
    await UserModel.create({
      firstname: "Rohit",
      lastname: "Vishwakarma",
      email: "wrongpass@example.com",
      password: hashedPassword,
    });

    const response = await request(app).post("/api/auth/login").send({
      email: "wrongpass@example.com",
      password: "incorrect",
    });

    expect(response.statusCode).toBe(403);
    expect(response.body.message).toBe("Wrong Password");
  });
});
