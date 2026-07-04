const ApiError = require("../utils/apiError");

// Valide les champs de la requete selon un schema de regles personnalise
const validate = (schema) => {
  return (req, res, next) => {
    const errors = [];
    const data = { ...req.body, ...req.params, ...req.query };

    for (const [field, rules] of Object.entries(schema)) {
      const value = data[field];

      for (const rule of rules) {
        if (rule.required && (value === undefined || value === null || value === "")) {
          errors.push({ field, message: `Le champ '${field}' est requis` });
          break;
        }

        if (value !== undefined && value !== null && value !== "") {
          if (rule.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            errors.push({ field, message: `Le champ '${field}' doit etre un email valide` });
          }
          if (rule.type === "minLength" && value.length < rule.value) {
            errors.push({ field, message: `Le champ '${field}' doit contenir au moins ${rule.value} caracteres` });
          }
          if (rule.type === "maxLength" && value.length > rule.value) {
            errors.push({ field, message: `Le champ '${field}' doit contenir au maximum ${rule.value} caracteres` });
          }
          if (rule.type === "oneOf" && !rule.values.includes(value)) {
            errors.push({ field, message: `Le champ '${field}' doit etre l'un de: ${rule.values.join(", ")}` });
          }
          if (rule.pattern && !rule.pattern.test(value)) {
            errors.push({ field, message: rule.message || `Le champ '${field}' n'est pas valide` });
          }
        }
      }
    }

    if (errors.length > 0) {
      return next(ApiError.badRequest("Erreur de validation", errors));
    }

    next();
  };
};

module.exports = validate;
