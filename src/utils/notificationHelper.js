const prisma = require("../config/database");
const { sendRealtimeNotification } = require("../config/socket");

// Cree une notification et l'envoie en temps reel
const createNotification = async ({ userId, type, title, content, link, senderId, relatedId }) => {
  try {
    const notification = await prisma.notification.create({
      data: { userId, type, title, content, link, senderId, relatedId },
    });

    // Envoi en temps reel
    sendRealtimeNotification(userId, notification);

    return notification;
  } catch (error) {
    console.error("Erreur creation notification:", error.message);
    return null;
  }
};

// Notifie tous les utilisateurs d'un type d'evenement
const notifyAllUsers = async ({ type, title, content, link, senderId, relatedId, excludeUserId = null }) => {
  try {
    const users = await prisma.user.findMany({
      where: {
        isActive: true,
        ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
      },
      select: { id: true },
    });

    const notifications = await Promise.all(
      users.map((user) =>
        prisma.notification.create({
          data: { userId: user.id, type, title, content, link, senderId, relatedId },
        })
      )
    );

    // Envoi temps reel pour chaque utilisateur
    notifications.forEach((notif) => {
      sendRealtimeNotification(notif.userId, notif);
    });

    return notifications;
  } catch (error) {
    console.error("Erreur notification massive:", error.message);
    return [];
  }
};

// Notifie les responsables (admin, apotre, pasteur)
const notifyLeaders = async ({ type, title, content, link, senderId, relatedId }) => {
  try {
    const leaders = await prisma.user.findMany({
      where: {
        isActive: true,
        role: { in: ["ADMIN", "APOTRE", "PASTEUR"] },
      },
      select: { id: true },
    });

    const notifications = await Promise.all(
      leaders.map((user) =>
        prisma.notification.create({
          data: { userId: user.id, type, title, content, link, senderId, relatedId },
        })
      )
    );

    notifications.forEach((notif) => {
      sendRealtimeNotification(notif.userId, notif);
    });

    return notifications;
  } catch (error) {
    console.error("Erreur notification leaders:", error.message);
    return [];
  }
};

module.exports = { createNotification, notifyAllUsers, notifyLeaders };
