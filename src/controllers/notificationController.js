const prisma = require("../config/database");
const ApiError = require("../utils/apiError");

// Liste des notifications de l'utilisateur connecte
const getMyNotifications = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 20, unreadOnly } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = { userId };
    if (unreadOnly === "true") where.isRead = false;

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: "desc" },
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId, isRead: false } }),
    ]);

    res.json({
      success: true,
      data: notifications,
      unreadCount,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
};

// Marquer une notification comme lue
const markAsRead = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const notification = await prisma.notification.findFirst({
      where: { id, userId },
    });

    if (!notification) {
      throw ApiError.notFound("Notification introuvable");
    }

    await prisma.notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });

    res.json({ success: true, message: "Notification marquee comme lue" });
  } catch (error) {
    next(error);
  }
};

// Marquer toutes les notifications comme lues
const markAllAsRead = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });

    res.json({ success: true, message: "Toutes les notifications marquees comme lues" });
  } catch (error) {
    next(error);
  }
};

// Supprimer une notification
const deleteNotification = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const notification = await prisma.notification.findFirst({
      where: { id, userId },
    });

    if (!notification) {
      throw ApiError.notFound("Notification introuvable");
    }

    await prisma.notification.delete({ where: { id } });

    res.json({ success: true, message: "Notification supprimee" });
  } catch (error) {
    next(error);
  }
};

module.exports = { getMyNotifications, markAsRead, markAllAsRead, deleteNotification };
