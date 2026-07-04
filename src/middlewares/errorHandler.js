// Middleware de gestion centralisee des erreurs
const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Erreur interne du serveur";

  if (process.env.NODE_ENV === "development") {
    console.error("ERROR:", err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    details: err.details || null,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

module.exports = errorHandler;
