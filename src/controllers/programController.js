const prisma = require("../config/database");
const ApiError = require("../utils/apiError");
const { notifyAllUsers } = require("../utils/notificationHelper");

// Programme de l'annee, mensuel, hebdomadaire, journalier
const getPrograms = async (req, res, next) => {
  try {
    const { type, isActive, page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (type) where.type = type;
    if (isActive !== undefined) where.isActive = isActive === "true";

    const [programs, total] = await Promise.all([
      prisma.program.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { startDate: "desc" },
        include: {
          author: {
            select: { id: true, firstName: true, lastName: true, role: true },
          },
        },
      }),
      prisma.program.count({ where }),
    ]);

    res.json({
      success: true,
      data: programs,
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

// Detail d'un programme
const getProgramById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const program = await prisma.program.findUnique({
      where: { id },
      include: {
        author: {
          select: { id: true, firstName: true, lastName: true, role: true },
        },
      },
    });

    if (!program) {
      throw ApiError.notFound("Programme introuvable");
    }

    res.json({ success: true, data: program });
  } catch (error) {
    next(error);
  }
};

// Creer un programme et notifier tous les utilisateurs
const createProgram = async (req, res, next) => {
  try {
    const authorId = req.user.userId;
    const { title, description, type, startDate, endDate, location } = req.body;

    const program = await prisma.program.create({
      data: {
        title,
        description,
        type,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : undefined,
        location,
        authorId,
      },
    });

    // Notification a tous les utilisateurs
    const typeLabels = { ANNUEL: "Annuel", MENSUEL: "Mensuel", HEBDOMADAIRE: "Hebdomadaire", JOURNALIER: "Journalier" };
    notifyAllUsers({
      type: "PROGRAM",
      title: `Nouveau programme ${typeLabels[type] || type}`,
      content: title,
      link: `/programs/${program.id}`,
      senderId: authorId,
      relatedId: program.id,
    });

    res.status(201).json({
      success: true,
      message: "Programme cree et publie avec succes",
      data: program,
    });
  } catch (error) {
    next(error);
  }
};

// Modifier un programme
const updateProgram = async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = req.body;

    const program = await prisma.program.findUnique({ where: { id } });
    if (!program) {
      throw ApiError.notFound("Programme introuvable");
    }

    const updated = await prisma.program.update({
      where: { id },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.type && { type: data.type }),
        ...(data.startDate && { startDate: new Date(data.startDate) }),
        ...(data.endDate !== undefined && { endDate: data.endDate ? new Date(data.endDate) : null }),
        ...(data.location !== undefined && { location: data.location }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });

    res.json({
      success: true,
      message: "Programme mis a jour avec succes",
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

// Supprimer un programme
const deleteProgram = async (req, res, next) => {
  try {
    const { id } = req.params;

    const program = await prisma.program.findUnique({ where: { id } });
    if (!program) {
      throw ApiError.notFound("Programme introuvable");
    }

    await prisma.program.delete({ where: { id } });

    res.json({ success: true, message: "Programme supprime" });
  } catch (error) {
    next(error);
  }
};

// Versets bibliques du jour (programme de type JOURNALIER)
const getDailyVerse = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dailyVerse = await prisma.program.findFirst({
      where: {
        type: "JOURNALIER",
        isActive: true,
        startDate: { lte: today },
        OR: [{ endDate: null }, { endDate: { gte: today } }],
      },
      orderBy: { startDate: "desc" },
      include: {
        author: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    res.json({ success: true, data: dailyVerse });
  } catch (error) {
    next(error);
  }
};

module.exports = { getPrograms, getProgramById, createProgram, updateProgram, deleteProgram, getDailyVerse };
