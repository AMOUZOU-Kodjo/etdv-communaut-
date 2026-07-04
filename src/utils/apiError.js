class ApiError extends Error {
  constructor(statusCode, message, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }

  // 400 - Erreur de validation ou requete invalide
  static badRequest(msg = "Requete invalide", details = null) {
    return new ApiError(400, msg, details);
  }

  // 401 - Authentification requise ou token invalide
  static unauthorized(msg = "Non autorise") {
    return new ApiError(401, msg);
  }

  // 403 - Droits insuffisants pour acceder a la ressource
  static forbidden(msg = "Acces interdit") {
    return new ApiError(403, msg);
  }

  // 404 - Ressource non trouvee
  static notFound(msg = "Ressource introuvable") {
    return new ApiError(404, msg);
  }

  // 409 - Conflit (ex: email deja utilise)
  static conflict(msg = "Conflit") {
    return new ApiError(409, msg);
  }

  // 500 - Erreur serveur interne
  static internal(msg = "Erreur interne du serveur") {
    return new ApiError(500, msg);
  }
}

module.exports = ApiError;
