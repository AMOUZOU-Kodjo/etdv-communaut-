const prisma = require("../config/database");
const ApiError = require("../utils/apiError");

// Liste de toutes les eglises
const getChurches = async (req, res, next) => {
  try {
    const churches = await prisma.church.findMany({
      where: { isActive: true },
      include: {
        _count: { select: { members: true } },
      },
      orderBy: { name: "asc" },
    });

    res.json({ success: true, data: churches });
  } catch (error) {
    next(error);
  }
};

// Detail d'une eglise avec ses membres
const getChurchById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const church = await prisma.church.findUnique({
      where: { id },
      include: {
        _count: { select: { members: true } },
      },
    });

    if (!church) {
      throw ApiError.notFound("Eglise introuvable");
    }

    res.json({ success: true, data: church });
  } catch (error) {
    next(error);
  }
};

// Creer une eglise (admin seulement)
const createChurch = async (req, res, next) => {
  try {
    const { name, address, city, country, phone, email, website, description, latitude, longitude, serviceHours, socialMedia } = req.body;

    const church = await prisma.church.create({
      data: { name, address, city, country, phone, email, website, description, latitude, longitude, serviceHours, socialMedia },
    });

    res.status(201).json({
      success: true,
      message: "Eglise creee avec succes",
      data: church,
    });
  } catch (error) {
    next(error);
  }
};

// Modifier une eglise (admin seulement)
const updateChurch = async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = req.body;

    const church = await prisma.church.findUnique({ where: { id } });
    if (!church) {
      throw ApiError.notFound("Eglise introuvable");
    }

    const updated = await prisma.church.update({
      where: { id },
      data,
    });

    res.json({
      success: true,
      message: "Eglise mise a jour avec succes",
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

// Supprimer une eglise (admin seulement)
const deleteChurch = async (req, res, next) => {
  try {
    const { id } = req.params;

    const church = await prisma.church.findUnique({ where: { id } });
    if (!church) {
      throw ApiError.notFound("Eglise introuvable");
    }

    await prisma.church.update({
      where: { id },
      data: { isActive: false },
    });

    res.json({ success: true, message: "Eglise desactivee avec succes" });
  } catch (error) {
    next(error);
  }
};

// Annuaire : liste des responsables (pasteurs, apotres, diacres, mamans pasteurs)
const getLeadership = async (req, res, next) => {
  try {
    const { churchId, ministry, gender } = req.query;

    const whereProfile = {
      ministry: { not: "AUCUN" },
    };
    if (ministry) whereProfile.ministry = ministry;
    if (gender) whereProfile.gender = gender;

    const whereUser = {
      isActive: true,
      role: { in: ["PASTEUR", "APOTRE"] },
    };
    if (churchId) whereUser.churchId = churchId;

    const leaders = await prisma.user.findMany({
      where: {
        ...whereUser,
        profile: whereProfile,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        email: true,
        role: true,
        church: { select: { id: true, name: true, city: true } },
        profile: {
          select: {
            ministry: true,
            gender: true,
            avatarUrl: true,
            bio: true,
            dateOfBirth: true,
          },
        },
      },
      orderBy: [{ role: "asc" }, { lastName: "asc" }],
    });

    res.json({ success: true, data: leaders });
  } catch (error) {
    next(error);
  }
};

// Annuaire : liste des fideles avec filtres (eglise, tranche age, sexe)
const getMembers = async (req, res, next) => {
  try {
    const { churchId, ministry, gender, minAge, maxAge, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const whereProfile = {};
    if (ministry) whereProfile.ministry = ministry;
    if (gender) whereProfile.gender = gender;
    if (minAge || maxAge) {
      const now = new Date();
      if (minAge) {
        const maxDate = new Date(now.getFullYear() - parseInt(minAge), now.getMonth(), now.getDate());
        whereProfile.dateOfBirth = { ...(whereProfile.dateOfBirth || {}), lte: maxDate };
      }
      if (maxAge) {
        const minDate = new Date(now.getFullYear() - parseInt(maxAge) - 1, now.getMonth(), now.getDate());
        whereProfile.dateOfBirth = { ...(whereProfile.dateOfBirth || {}), gte: minDate };
      }
    }

    const whereUser = { isActive: true };
    if (churchId) whereUser.churchId = churchId;

    const [members, total] = await Promise.all([
      prisma.user.findMany({
        where: { ...whereUser, profile: Object.keys(whereProfile).length > 0 ? whereProfile : undefined },
        skip,
        take: parseInt(limit),
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          email: true,
          role: true,
          church: { select: { id: true, name: true, city: true } },
          profile: {
            select: {
              ministry: true,
              gender: true,
              avatarUrl: true,
              dateOfBirth: true,
              city: true,
            },
          },
        },
        orderBy: [{ lastName: "asc" }],
      }),
      prisma.user.count({
        where: { ...whereUser, profile: Object.keys(whereProfile).length > 0 ? whereProfile : undefined },
      }),
    ]);

    res.json({
      success: true,
      data: members,
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

// Annuaire : liste des visiteurs
const getVisitors = async (req, res, next) => {
  try {
    const { churchId, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      role: "VISITEUR",
      isActive: true,
    };
    if (churchId) where.churchId = churchId;

    const [visitors, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: parseInt(limit),
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          email: true,
          church: { select: { id: true, name: true } },
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      success: true,
      data: visitors,
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

module.exports = { getChurches, getChurchById, createChurch, updateChurch, deleteChurch, getLeadership, getMembers, getVisitors };
