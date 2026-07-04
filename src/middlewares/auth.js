const { verifyAccessToken } = require("../utils/generateTokens");
const ApiError = require("../utils/apiError");

// Verifie que l'utilisateur est bien connecte via un token JWT valide
const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw ApiError.unauthorized("Token d'acces manquant");
    }

    const token = authHeader.split(" ")[1];
    const decoded = verifyAccessToken(token);

    // Injecte les infos utilisateur dans la requete pour les controllers
    req.user = {
      userId: decoded.userId,
      role: decoded.role,
    };

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return next(ApiError.unauthorized("Token d'acces expire"));
    }
    if (error.name === "JsonWebTokenError") {
      return next(ApiError.unauthorized("Token d'acces invalide"));
    }
    next(error);
  }
};

// Verifie que l'utilisateur a un role parmi ceux autorises
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized("Non authentifie"));
    }

    if (!roles.includes(req.user.role)) {
      return next(ApiError.forbidden("Vous n'avez pas les droits necessaires"));
    }

    next();
  };
};

module.exports = { authenticate, authorize };
