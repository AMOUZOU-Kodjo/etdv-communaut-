const prisma = require("../config/database");
const ApiError = require("../utils/apiError");
const { notifyAllUsers } = require("../utils/notificationHelper");

// Liste des evenements
const getEvents = async (req, res, next) => {
  try {
    const { type, status, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (type) where.type = type;
    if (status) where.status = status;

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { date: "asc" },
        include: {
          organizer: {
            select: { id: true, firstName: true, lastName: true, role: true },
          },
        },
      }),
      prisma.event.count({ where }),
    ]);

    res.json({
      success: true,
      data: events,
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

// Detail d'un evenement
const getEventById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        organizer: {
          select: { id: true, firstName: true, lastName: true, role: true },
        },
      },
    });

    if (!event) {
      throw ApiError.notFound("Evenement introuvable");
    }

    res.json({ success: true, data: event });
  } catch (error) {
    next(error);
  }
};

// Creer un evenement et notifier tous les utilisateurs
const createEvent = async (req, res, next) => {
  try {
    const organizerId = req.user.userId;
    const { title, description, date, startTime, endTime, location, address, imageUrl, maxCapacity, type } = req.body;

    const event = await prisma.event.create({
      data: {
        title,
        description,
        date: new Date(date),
        startTime,
        endTime,
        location,
        address,
        imageUrl,
        maxCapacity: maxCapacity ? parseInt(maxCapacity) : undefined,
        type: type || "CULTE",
        organizerId,
      },
    });

    // Notification a tous les utilisateurs
    notifyAllUsers({
      type: "EVENT",
      title: `Nouvel evenement: ${title}`,
      content: `${new Date(date).toLocaleDateString("fr-FR")} - ${description?.substring(0, 100) || "Pas de description"}`,
      link: `/events/${event.id}`,
      senderId: organizerId,
      relatedId: event.id,
    });

    res.status(201).json({
      success: true,
      message: "Evenement cree et publie avec succes",
      data: event,
    });
  } catch (error) {
    next(error);
  }
};

// Modifier un evenement
const updateEvent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = req.body;

    const event = await prisma.event.findUnique({ where: { id } });
    if (!event) {
      throw ApiError.notFound("Evenement introuvable");
    }

    const updated = await prisma.event.update({
      where: { id },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.date && { date: new Date(data.date) }),
        ...(data.startTime !== undefined && { startTime: data.startTime }),
        ...(data.endTime !== undefined && { endTime: data.endTime }),
        ...(data.location !== undefined && { location: data.location }),
        ...(data.address !== undefined && { address: data.address }),
        ...(data.status && { status: data.status }),
        ...(data.type && { type: data.type }),
        ...(data.maxCapacity !== undefined && { maxCapacity: parseInt(data.maxCapacity) }),
        ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl }),
      },
    });

    res.json({
      success: true,
      message: "Evenement mis a jour avec succes",
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

// Supprimer un evenement
const deleteEvent = async (req, res, next) => {
  try {
    const { id } = req.params;

    const event = await prisma.event.findUnique({ where: { id } });
    if (!event) {
      throw ApiError.notFound("Evenement introuvable");
    }

    await prisma.event.delete({ where: { id } });

    res.json({ success: true, message: "Evenement supprime" });
  } catch (error) {
    next(error);
  }
};

module.exports = { getEvents, getEventById, createEvent, updateEvent, deleteEvent };
