const prisma = require("../config/database");
const ApiError = require("../utils/apiError");
const { createNotification } = require("../utils/notificationHelper");

// S'inscrire a un evenement
const registerForEvent = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { eventId } = req.params;

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw ApiError.notFound("Evenement introuvable");
    if (event.status === "TERMINE") throw ApiError.badRequest("Cet evenement est termine");

    const existing = await prisma.eventRegistration.findUnique({
      where: { eventId_userId: { eventId, userId } },
    });
    if (existing) throw ApiError.conflict("Vous etes deja inscrit a cet evenement");

    if (event.maxCapacity) {
      const count = await prisma.eventRegistration.count({ where: { eventId, status: { not: "ANNULE" } } });
      if (count >= event.maxCapacity) throw ApiError.badRequest("Nombre maximum de participants atteint");
    }

    const registration = await prisma.eventRegistration.create({
      data: { eventId, userId },
      include: {
        event: { select: { id: true, title: true, date: true, location: true } },
        user: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    res.status(201).json({ success: true, data: registration });
  } catch (error) {
    next(error);
  }
};

// Valider une inscription (ADMIN, APOTRE, organisateur de l'evenement)
const validateRegistration = async (req, res, next) => {
  try {
    const { registrationId } = req.params;
    const validatorId = req.user.userId;
    const validatorRole = req.user.role;

    const registration = await prisma.eventRegistration.findUnique({
      where: { id: registrationId },
      include: { event: { select: { organizerId: true, title: true } } },
    });
    if (!registration) throw ApiError.notFound("Inscription introuvable");
    if (registration.status === "VALIDE") throw ApiError.badRequest("Deja valide");

    if (validatorRole !== "ADMIN" && validatorRole !== "APOTRE" && registration.event.organizerId !== validatorId) {
      throw ApiError.forbidden("Vous n'avez pas le droit de valider cette inscription");
    }

    const receiptNumber = `REC-${registration.eventId.slice(0, 6).toUpperCase()}-${registration.id.slice(0, 6).toUpperCase()}`;

    const updated = await prisma.eventRegistration.update({
      where: { id: registrationId },
      data: { status: "VALIDE", validatedAt: new Date(), validatedById: validatorId, receiptNumber },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        event: { select: { id: true, title: true, date: true, location: true, organizer: { select: { firstName: true, lastName: true } }, church: { select: { name: true, logoUrl: true } } } },
        validatedBy: { select: { firstName: true, lastName: true } },
      },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

// Recu de participation (genere les donnees pour l'impression)
const getReceipt = async (req, res, next) => {
  try {
    const { registrationId } = req.params;

    const registration = await prisma.eventRegistration.findUnique({
      where: { id: registrationId },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        event: {
          select: {
            id: true, title: true, date: true, startTime: true, endTime: true, location: true, address: true,
            organizer: { select: { firstName: true, lastName: true } },
            church: { select: { name: true, logoUrl: true, address: true, city: true, phone: true, email: true } },
          },
        },
        validatedBy: { select: { firstName: true, lastName: true } },
      },
    });
    if (!registration) throw ApiError.notFound("Inscription introuvable");
    if (registration.status !== "VALIDE") throw ApiError.badRequest("Inscription non validee");

    res.json({ success: true, data: registration });
  } catch (error) {
    next(error);
  }
};

// Lister les inscriptions de l'utilisateur connecte
const getMyRegistrations = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const registrations = await prisma.eventRegistration.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        event: { select: { id: true, title: true, date: true, location: true, imageUrl: true } },
      },
    });
    res.json({ success: true, data: registrations });
  } catch (error) {
    next(error);
  }
};

// Lister les inscriptions pour un evenement (organisateur, ADMIN, APOTRE)
const getEventRegistrations = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const { status } = req.query;

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw ApiError.notFound("Evenement introuvable");

    const where = { eventId };
    if (status) where.status = status;

    const registrations = await prisma.eventRegistration.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
      },
    });

    res.json({ success: true, data: registrations });
  } catch (error) {
    next(error);
  }
};

// Annuler une inscription
const cancelRegistration = async (req, res, next) => {
  try {
    const { registrationId } = req.params;
    const userId = req.user.userId;

    const registration = await prisma.eventRegistration.findUnique({ where: { id: registrationId } });
    if (!registration) throw ApiError.notFound("Inscription introuvable");

    if (registration.userId !== userId) {
      throw ApiError.forbidden("Vous ne pouvez annuler que vos propres inscriptions");
    }

    await prisma.eventRegistration.update({
      where: { id: registrationId },
      data: { status: "ANNULE" },
    });

    res.json({ success: true, message: "Inscription annulee" });
  } catch (error) {
    next(error);
  }
};

module.exports = { registerForEvent, validateRegistration, getReceipt, getMyRegistrations, getEventRegistrations, cancelRegistration };
