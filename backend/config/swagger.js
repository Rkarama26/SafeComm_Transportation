const swaggerJSDoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "SafeComm Transportation API",
      version: "1.0.0",
      description:
        "API for SafeComm Transportation system - Real-time transit tracking and safety reporting",
      contact: {
        name: "SafeComm Team",
      },
    },
    servers: [
      {
        url: "http://localhost:4000",
        description: "Development server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        User: {
          type: "object",
          properties: {
            _id: {
              type: "string",
              description: "User ID",
            },
            email: {
              type: "string",
              format: "email",
              description: "User email address",
            },
            name: {
              type: "string",
              description: "User full name",
            },
            role: {
              type: "string",
              enum: ["user", "admin"],
              description: "User role",
            },
            createdAt: {
              type: "string",
              format: "date-time",
              description: "Account creation timestamp",
            },
          },
        },
        Vehicle: {
          type: "object",
          properties: {
            vehicleId: {
              type: "string",
              description: "Unique vehicle identifier",
            },
            routeId: {
              type: "string",
              description: "Route identifier",
            },
            latitude: {
              type: "number",
              format: "float",
              description: "Vehicle latitude coordinate",
            },
            longitude: {
              type: "number",
              format: "float",
              description: "Vehicle longitude coordinate",
            },
            timestamp: {
              type: "string",
              format: "date-time",
              description: "Position timestamp",
            },
            speed: {
              type: "number",
              format: "float",
              description: "Vehicle speed in km/h",
            },
            direction: {
              type: "number",
              format: "float",
              description: "Vehicle direction in degrees",
            },
          },
        },
        Route: {
          type: "object",
          properties: {
            routeId: {
              type: "string",
              description: "Unique route identifier",
            },
            routeShortName: {
              type: "string",
              description: "Short route name",
            },
            routeLongName: {
              type: "string",
              description: "Long route name",
            },
            routeType: {
              type: "integer",
              description: "GTFS route type",
            },
            agencyId: {
              type: "string",
              description: "Agency identifier",
            },
          },
        },
        Stop: {
          type: "object",
          properties: {
            stopId: {
              type: "string",
              description: "Unique stop identifier",
            },
            stopName: {
              type: "string",
              description: "Stop name",
            },
            stopLat: {
              type: "number",
              format: "float",
              description: "Stop latitude",
            },
            stopLon: {
              type: "number",
              format: "float",
              description: "Stop longitude",
            },
            stopCode: {
              type: "string",
              description: "Stop code",
            },
          },
        },
        SafetyReport: {
          type: "object",
          properties: {
            _id: {
              type: "string",
              description: "Report ID",
            },
            userId: {
              type: "string",
              description: "User who submitted the report",
            },
            type: {
              type: "string",
              enum: ["harassment", "theft", "medical", "mechanical", "other"],
              description: "Type of safety incident",
            },
            description: {
              type: "string",
              description: "Detailed description of the incident",
            },
            location: {
              type: "object",
              properties: {
                latitude: {
                  type: "number",
                  format: "float",
                },
                longitude: {
                  type: "number",
                  format: "float",
                },
              },
              description: "Incident location coordinates",
            },
            vehicleId: {
              type: "string",
              description:
                "Vehicle identifier if incident occurred on a vehicle",
            },
            routeId: {
              type: "string",
              description: "Route identifier if incident occurred on a route",
            },
            timestamp: {
              type: "string",
              format: "date-time",
              description: "Incident timestamp",
            },
            status: {
              type: "string",
              enum: ["pending", "investigating", "resolved"],
              description: "Report status",
            },
          },
        },
        Error: {
          type: "object",
          properties: {
            success: {
              type: "boolean",
              example: false,
            },
            message: {
              type: "string",
              description: "Error message",
            },
            error: {
              type: "string",
              description: "Detailed error information",
            },
          },
        },
        Success: {
          type: "object",
          properties: {
            success: {
              type: "boolean",
              example: true,
            },
            message: {
              type: "string",
              description: "Success message",
            },
            data: {
              type: "object",
              description: "Response data",
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ["./routes/*.js", "./controllers/*.js", "./models/*.js"],
};

const specs = swaggerJSDoc(options);

const setupSwagger = (app) => {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs));

  // Redirect root to API docs
  app.get("/", (req, res) => {
    res.redirect("/api-docs");
  });
};

module.exports = setupSwagger;
