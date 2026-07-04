const prisma = require("../config/database");
const ApiError = require("../utils/apiError");
const { sendEmail } = require("../utils/email");

// S'abonner a la newsletter (public, sans auth)
const subscribe = async (req, res, next) => {
  try {
    const { email, name } = req.body;
    if (!email) throw ApiError.badRequest("Email requis");

    const existing = await prisma.subscription.findUnique({ where: { email } });
    if (existing) {
      if (!existing.isActive) {
        await prisma.subscription.update({
          where: { email },
          data: { isActive: true, unsubscribedAt: null },
        });
        return res.json({ success: true, message: "Reabonne avec succes" });
      }
      return res.json({ success: true, message: "Deja abonne" });
    }

    await prisma.subscription.create({ data: { email, name } });

    res.status(201).json({ success: true, message: "Abonnement reussi" });
  } catch (error) {
    next(error);
  }
};

// Se desabonner
const unsubscribe = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) throw ApiError.badRequest("Email requis");

    const sub = await prisma.subscription.findUnique({ where: { email } });
    if (!sub) throw ApiError.notFound("Email non abonne");

    await prisma.subscription.update({
      where: { email },
      data: { isActive: false, unsubscribedAt: new Date() },
    });

    res.json({ success: true, message: "Desabonne avec succes" });
  } catch (error) {
    next(error);
  }
};

// Lister les abonnes (ADMIN, APOTRE)
const getSubscriptions = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, isActive } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (isActive !== undefined) where.isActive = isActive === "true";

    const [subs, total] = await Promise.all([
      prisma.subscription.findMany({ where, skip, take: parseInt(limit), orderBy: { createdAt: "desc" } }),
      prisma.subscription.count({ where }),
    ]);

    res.json({
      success: true,
      data: subs,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { subscribe, unsubscribe, getSubscriptions };
