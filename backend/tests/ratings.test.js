const request = require("supertest");
const app = require("../app");
const User = require("../models/user");
const Route = require("../gtfs_models/Routes");
const RouteRating = require("../models/routeRating.model");
const { connectDB, dropDB } = require("./dbHandler");

describe("Route Safety Rating API", () => {
  let token;
  let userId;
  let routeId;
  let ratingId;

  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await dropDB();
  });

  describe("Authentication Setup", () => {
    it("should register a new user", async () => {
      const res = await request(app).post("/api/auth/register").send({
        firstname: "John",
        lastname: "Doe",
        email: "john@example.com",
        password: "password123",
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      userId = res.body.data.user._id;
    });

    it("should login user and get JWT token", async () => {
      const res = await request(app).post("/api/auth/login").send({
        email: "john@example.com",
        password: "password123",
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      token = res.body.data.access_token;
      expect(token).toBeDefined();
    });
  });

  describe("Route Setup", () => {
    it("should create a test route", async () => {
      const route = new Route({
        route_id: "101",
        route_short_name: "101",
        route_long_name: "Downtown Express",
        route_type: 3,
        route_url: "http://transit.gov/route/101",
      });

      const savedRoute = await route.save();
      routeId = savedRoute._id;
      expect(routeId).toBeDefined();
    });
  });

  describe("POST /api/feed/ratings - Create Rating", () => {
    it("should fail without authentication", async () => {
      const res = await request(app).post("/api/feed/ratings").send({
        routeId: routeId.toString(),
        rating: 4,
        feedback: "Safe route",
      });

      expect(res.status).toBe(401);
    });

    it("should fail with invalid rating", async () => {
      const res = await request(app)
        .post("/api/feed/ratings")
        .set("Authorization", `Bearer ${token}`)
        .send({
          routeId: routeId.toString(),
          rating: 10,
          feedback: "Safe route",
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("Rating must be between 1 and 5");
    });

    it("should fail with non-existent route", async () => {
      const res = await request(app)
        .post("/api/feed/ratings")
        .set("Authorization", `Bearer ${token}`)
        .send({
          routeId: "507f1f77bcf86cd799439011",
          rating: 4,
          feedback: "Safe route",
        });

      expect(res.status).toBe(404);
      expect(res.body.message).toContain("Route not found");
    });

    it("should create a new rating successfully", async () => {
      const res = await request(app)
        .post("/api/feed/ratings")
        .set("Authorization", `Bearer ${token}`)
        .send({
          routeId: routeId.toString(),
          rating: 4,
          feedback: "Safe route during rush hours",
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.rating).toBe(4);
      expect(res.body.data.feedback).toBe("Safe route during rush hours");
      ratingId = res.body.data._id;
    });

    it("should update existing rating for same user-route pair", async () => {
      const res = await request(app)
        .post("/api/feed/ratings")
        .set("Authorization", `Bearer ${token}`)
        .send({
          routeId: routeId.toString(),
          rating: 3,
          feedback: "Updated feedback",
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain("Rating updated successfully");
      expect(res.body.data.rating).toBe(3);
    });
  });

  describe("GET /api/feed/ratings/:routeId - Get Route Ratings", () => {
    it("should fail with non-existent route", async () => {
      const res = await request(app).get(
        "/api/feed/ratings/507f1f77bcf86cd799439011"
      );

      expect(res.status).toBe(404);
      expect(res.body.message).toContain("Route not found");
    });

    it("should get all ratings for a route", async () => {
      const res = await request(app).get(
        `/api/feed/ratings/${routeId.toString()}`
      );

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.count).toBeGreaterThan(0);
      expect(res.body.averageRating).toBeDefined();
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it("should include user info in ratings", async () => {
      const res = await request(app).get(
        `/api/feed/ratings/${routeId.toString()}`
      );

      expect(res.body.data[0].user).toBeDefined();
      expect(res.body.data[0].user.name).toBeDefined();
      expect(res.body.data[0].user.email).toBeDefined();
    });

    it("should calculate average rating correctly", async () => {
      // Create another user and rating
      const user2Res = await request(app).post("/api/auth/register").send({
        firstname: "Jane",
        lastname: "Smith",
        email: "jane@example.com",
        password: "password123",
      });

      const user2Token = (
        await request(app).post("/api/auth/login").send({
          email: "jane@example.com",
          password: "password123",
        })
      ).body.data.access_token;

      await request(app)
        .post("/api/feed/ratings")
        .set("Authorization", `Bearer ${user2Token}`)
        .send({
          routeId: routeId.toString(),
          rating: 5,
          feedback: "Very safe",
        });

      const res = await request(app).get(
        `/api/feed/ratings/${routeId.toString()}`
      );

      expect(res.body.count).toBe(2);
      // Average of 3 (updated) and 5
      expect(res.body.averageRating).toBe(4);
    });
  });

  describe("GET /api/feed/ratings/user/my-ratings - Get User Ratings", () => {
    it("should fail without authentication", async () => {
      const res = await request(app).get("/api/feed/ratings/user/my-ratings");

      expect(res.status).toBe(401);
    });

    it("should get all ratings submitted by current user", async () => {
      const res = await request(app)
        .get("/api/feed/ratings/user/my-ratings")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.count).toBeGreaterThan(0);
    });

    it("should include route info in user ratings", async () => {
      const res = await request(app)
        .get("/api/feed/ratings/user/my-ratings")
        .set("Authorization", `Bearer ${token}`);

      if (res.body.data.length > 0) {
        expect(res.body.data[0].route).toBeDefined();
        expect(res.body.data[0].route.route_short_name).toBeDefined();
      }
    });
  });

  describe("PUT /api/feed/ratings/:ratingId - Update Rating", () => {
    it("should fail without authentication", async () => {
      const res = await request(app).put(`/api/feed/ratings/${ratingId}`).send({
        rating: 5,
      });

      expect(res.status).toBe(401);
    });

    it("should fail if not the rating owner", async () => {
      // Create another user
      const user3Res = await request(app).post("/api/auth/register").send({
        firstname: "Bob",
        lastname: "Johnson",
        email: "bob@example.com",
        password: "password123",
      });

      const user3Token = (
        await request(app).post("/api/auth/login").send({
          email: "bob@example.com",
          password: "password123",
        })
      ).body.data.access_token;

      const res = await request(app)
        .put(`/api/feed/ratings/${ratingId}`)
        .set("Authorization", `Bearer ${user3Token}`)
        .send({
          rating: 5,
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain(
        "You can only update your own ratings"
      );
    });

    it("should update rating with valid data", async () => {
      const res = await request(app)
        .put(`/api/feed/ratings/${ratingId}`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          rating: 2,
          feedback: "Changed my mind after recent incident",
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.rating).toBe(2);
    });

    it("should fail with invalid rating value", async () => {
      const res = await request(app)
        .put(`/api/feed/ratings/${ratingId}`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          rating: 6,
        });

      expect(res.status).toBe(400);
    });

    it("should fail with non-existent rating", async () => {
      const res = await request(app)
        .put("/api/feed/ratings/507f1f77bcf86cd799439011")
        .set("Authorization", `Bearer ${token}`)
        .send({
          rating: 4,
        });

      expect(res.status).toBe(404);
      expect(res.body.message).toContain("Rating not found");
    });
  });

  describe("DELETE /api/feed/ratings/:ratingId - Delete Rating", () => {
    it("should fail without authentication", async () => {
      const res = await request(app).delete(`/api/feed/ratings/${ratingId}`);

      expect(res.status).toBe(401);
    });

    it("should fail if not the rating owner", async () => {
      const user4Res = await request(app).post("/api/auth/register").send({
        firstname: "Alice",
        lastname: "Williams",
        email: "alice@example.com",
        password: "password123",
      });

      const user4Token = (
        await request(app).post("/api/auth/login").send({
          email: "alice@example.com",
          password: "password123",
        })
      ).body.data.access_token;

      const res = await request(app)
        .delete(`/api/feed/ratings/${ratingId}`)
        .set("Authorization", `Bearer ${user4Token}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toContain(
        "You can only delete your own ratings"
      );
    });

    it("should delete rating successfully", async () => {
      const res = await request(app)
        .delete(`/api/feed/ratings/${ratingId}`)
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain("Rating deleted successfully");
    });

    it("should fail with non-existent rating", async () => {
      const res = await request(app)
        .delete("/api/feed/ratings/507f1f77bcf86cd799439011")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });

  describe("GET /api/feed/stats/by-route/:routeId - Safety Statistics", () => {
    it("should fail with non-existent route", async () => {
      const res = await request(app).get(
        "/api/feed/stats/by-route/507f1f77bcf86cd799439011"
      );

      expect(res.status).toBe(404);
    });

    it("should get route safety statistics", async () => {
      const res = await request(app).get(
        `/api/feed/stats/by-route/${routeId.toString()}`
      );

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.route).toBeDefined();
      expect(res.body.data.ratings).toBeDefined();
      expect(res.body.data.reports).toBeDefined();
      expect(res.body.data.safetyScore).toBeDefined();
    });

    it("should include rating distribution", async () => {
      const res = await request(app).get(
        `/api/feed/stats/by-route/${routeId.toString()}`
      );

      expect(res.body.data.ratings.distribution).toBeDefined();
      expect(res.body.data.ratings.distribution["5"]).toBeDefined();
      expect(res.body.data.ratings.distribution["1"]).toBeDefined();
    });

    it("should include report statistics", async () => {
      const res = await request(app).get(
        `/api/feed/stats/by-route/${routeId.toString()}`
      );

      expect(res.body.data.reports.total).toBeDefined();
      expect(res.body.data.reports.open).toBeDefined();
      expect(res.body.data.reports.investigating).toBeDefined();
      expect(res.body.data.reports.resolved).toBeDefined();
    });

    it("should calculate safety score", async () => {
      const res = await request(app).get(
        `/api/feed/stats/by-route/${routeId.toString()}`
      );

      const safetyScore = res.body.data.safetyScore;
      expect(safetyScore).toBeGreaterThanOrEqual(0);
      expect(safetyScore).toBeLessThanOrEqual(100);
    });
  });

  describe("Input Validation", () => {
    it("should reject feedback exceeding 500 characters", async () => {
      const longFeedback = "a".repeat(501);
      const res = await request(app)
        .post("/api/feed/ratings")
        .set("Authorization", `Bearer ${token}`)
        .send({
          routeId: routeId.toString(),
          rating: 4,
          feedback: longFeedback,
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("exceed 500 characters");
    });

    it("should accept feedback up to 500 characters", async () => {
      const feedback = "a".repeat(500);
      const res = await request(app)
        .post("/api/feed/ratings")
        .set("Authorization", `Bearer ${token}`)
        .send({
          routeId: routeId.toString(),
          rating: 4,
          feedback: feedback,
        });

      expect(res.status).toBeOneOf([200, 201]);
    });
  });
});
