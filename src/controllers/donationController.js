const prisma = require("../config/database");
const ApiError = require("../utils/apiError");

const VALID_PAYMENTS = ["FLOOZ", "TMONEY", "PAYPAL", "CARTE"];

const makeDonation = async (req, res, next) => {
  try {
    const { amount, currency, type, description, paymentMethod, phone, churchId, eventId } = req.body;
    const donorId = req.user.userId;

    if (!amount || amount <= 0) throw ApiError.badRequest("Montant invalide");

    if (paymentMethod && !VALID_PAYMENTS.includes(paymentMethod)) {
      throw ApiError.badRequest("Methode de paiement invalide. Utilisez FLOOZ, TMONEY, PAYPAL ou CARTE");
    }

    if (paymentMethod === "FLOOZ" || paymentMethod === "TMONEY") {
      if (!phone) throw ApiError.badRequest("Numero de telephone requis pour Flooz/TMoney");
    }

    if (churchId) {
      const church = await prisma.church.findUnique({ where: { id: churchId } });
      if (!church) throw ApiError.notFound("Eglise introuvable");
    }

    if (eventId) {
      const event = await prisma.event.findUnique({ where: { id: eventId } });
      if (!event) throw ApiError.notFound("Evenement introuvable");
    }

    const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    const donation = await prisma.donation.create({
      data: {
        amount,
        currency: currency || "XAF",
        type: type || "OFFRANDE",
        description,
        paymentMethod,
        phone,
        transactionId,
        status: "EN_ATTENTE",
        donorId,
        churchId,
        eventId,
      },
      include: {
        donor: { select: { id: true, firstName: true, lastName: true } },
        church: { select: { id: true, name: true } },
        event: { select: { id: true, title: true } },
      },
    });

    res.status(201).json({ success: true, data: donation });
  } catch (error) {
    next(error);
  }
};

const confirmDonation = async (req, res, next) => {
  try {
    const { id } = req.params;

    const donation = await prisma.donation.findUnique({ where: { id } });
    if (!donation) throw ApiError.notFound("Donation introuvable");
    if (donation.status !== "EN_ATTENTE") throw ApiError.badRequest("Deja traite");

    const updated = await prisma.donation.update({
      where: { id },
      data: { status: "CONFIRME" },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

const getMyDonations = async (req, res, next) => {
  try {
    const donorId = req.user.userId;
    const { page = 1, limit = 20, status } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = { donorId };
    if (status) where.status = status;

    const [donations, total] = await Promise.all([
      prisma.donation.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: "desc" },
        include: {
          church: { select: { id: true, name: true } },
          event: { select: { id: true, title: true } },
        },
      }),
      prisma.donation.count({ where }),
    ]);

    res.json({
      success: true,
      data: donations,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (error) {
    next(error);
  }
};

const getAllDonations = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, churchId, eventId } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (status) where.status = status;
    if (churchId) where.churchId = churchId;
    if (eventId) where.eventId = eventId;

    const [donations, total] = await Promise.all([
      prisma.donation.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: "desc" },
        include: {
          donor: { select: { id: true, firstName: true, lastName: true } },
          church: { select: { id: true, name: true } },
          event: { select: { id: true, title: true } },
        },
      }),
      prisma.donation.count({ where }),
    ]);

    res.json({
      success: true,
      data: donations,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { makeDonation, confirmDonation, getMyDonations, getAllDonations };
