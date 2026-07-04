const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const routes = require("./routes");
const errorHandler = require("./middlewares/errorHandler");
const ApiError = require("./utils/apiError");

const app = express();

// Configuration CORS pour autoriser les requetes du frontend
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:5173",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// Parsing du body et des cookies
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Routes de l'API prefixees par /api/v1
app.use("/api/v1", routes);

// Gestion des routes inexistantes
app.use((req, res, next) => {
  next(ApiError.notFound(`Route ${req.originalUrl} introuvable`));
});

// Middleware de gestion globale des erreurs
app.use(errorHandler);

module.exports = app;
