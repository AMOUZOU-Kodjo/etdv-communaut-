const prisma = require("../config/database");
const ApiError = require("../utils/apiError");
const { sendMorningPrayerNotification } = require("../utils/email");
const { sendRealtimeNotification } = require("../config/socket");

const createMorningPrayer = async (req, res, next) => {
  try {
    const { title, content, bibleVerse, imageUrl } = req.body;
    const authorId = req.user.userId;
    const authorRole = req.user.role;

    if (authorRole !== "PASTEUR" && authorRole !== "APOTRE" && authorRole !== "ADMIN") {
      throw ApiError.forbidden("Seuls les pasteurs, apotres et administrateurs peuvent publier une priere matinale");
    }

    const prayer = await prisma.morningPrayer.create({
      data: { title, content, bibleVerse, imageUrl, authorId },
      include: { author: { select: { id: true, firstName: true, lastName: true } } },
    });

    const authorName = `${prayer.author.firstName} ${prayer.author.lastName}`;

    const allUsers = await prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, email: true },
    });

    const siteUrl = process.env.CLIENT_URL || "http://localhost:5173";
    const link = `${siteUrl}/prieres-matinales/${prayer.id}`;

    for (const user of allUsers) {
      await sendRealtimeNotification(user.id, {
        type: "PRAYER",
        title: `Priere matinale par ${authorName}`,
        content: prayer.title,
        link,
        senderId: authorId,
        relatedId: prayer.id,
      });

      await sendMorningPrayerNotification(user, prayer, authorName);
    }

    res.status(201).json({ success: true, data: prayer });
  } catch (error) {
    next(error);
  }
};

const getMorningPrayers = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [prayers, total] = await Promise.all([
      prisma.morningPrayer.findMany({
        where: { isActive: true },
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: "desc" },
        include: {
          author: { select: { id: true, firstName: true, lastName: true, role: true } },
        },
      }),
      prisma.morningPrayer.count({ where: { isActive: true } }),
    ]);

    res.json({
      success: true,
      data: prayers,
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

const getMorningPrayerById = async (req, res, next) => {
  try {
    const prayer = await prisma.morningPrayer.findUnique({
      where: { id: req.params.id },
      include: {
        author: { select: { id: true, firstName: true, lastName: true, role: true, churchId: true } },
      },
    });
    if (!prayer) throw ApiError.notFound("Priere matinale introuvable");
    res.json({ success: true, data: prayer });
  } catch (error) {
    next(error);
  }
};

const updateMorningPrayer = async (req, res, next) => {
  try {
    const { title, content, bibleVerse, imageUrl, isActive } = req.body;

    const prayer = await prisma.morningPrayer.findUnique({ where: { id: req.params.id } });
    if (!prayer) throw ApiError.notFound("Priere matinale introuvable");

    if (req.user.role !== "ADMIN" && prayer.authorId !== req.user.userId) {
      throw ApiError.forbidden("Vous ne pouvez modifier que vos propres prieres");
    }

    const updated = await prisma.morningPrayer.update({
      where: { id: req.params.id },
      data: { ...(title && { title }), ...(content && { content }), ...(bibleVerse !== undefined && { bibleVerse }), ...(imageUrl !== undefined && { imageUrl }), ...(isActive !== undefined && { isActive }) },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

const deleteMorningPrayer = async (req, res, next) => {
  try {
    const prayer = await prisma.morningPrayer.findUnique({ where: { id: req.params.id } });
    if (!prayer) throw ApiError.notFound("Priere matinale introuvable");

    if (req.user.role !== "ADMIN" && prayer.authorId !== req.user.userId) {
      throw ApiError.forbidden("Vous ne pouvez supprimer que vos propres prieres");
    }

    await prisma.morningPrayer.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: "Priere matinale supprimee" });
  } catch (error) {
    next(error);
  }
};

module.exports = { createMorningPrayer, getMorningPrayers, getMorningPrayerById, updateMorningPrayer, deleteMorningPrayer };
