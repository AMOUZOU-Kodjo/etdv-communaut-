// Regles de permissions pour la messagerie selon les roles
// ADMIN et APOTRE : peuvent parler a tout le monde
// PASTEUR : peut parler a tout le monde
// FIDELES : peut parler a PASTEUR, APOTRE, FIDELES
// VISITEUR : peut parler a PASTEUR, APOTRE, FIDELES, VISITEUR (sauf ADMIN)

const canSendMessage = (senderRole, recipientRole) => {
  // Admin et Apotre parlent a tout le monde
  if (senderRole === "ADMIN" || senderRole === "APOTRE") return true;
  // Pasteur parle a tout le monde
  if (senderRole === "PASTEUR") return true;
  // Fidele peut parler a Pasteur, Apotre et autres fideles
  if (senderRole === "FIDELES") {
    return ["PASTEUR", "APOTRE", "FIDELES"].includes(recipientRole);
  }
  // Visiteur peut parler a tout le monde sauf Admin
  if (senderRole === "VISITEUR") {
    return recipientRole !== "ADMIN";
  }
  return false;
};

module.exports = { canSendMessage };
