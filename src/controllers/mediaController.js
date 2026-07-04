const prisma = require("../config/database");
const ApiError = require("../utils/apiError");

// Verifie si l'utilisateur a le droit de publier
const canPublish = (role) => {
  return ["ADMIN", "APOTRE", "PASTEUR"].includes(role);
};

// Verifie si l'utilisateur a le droit de gerer (modifier, supprimer, masquer)
const canManage = (role) => {
  return ["ADMIN", "APOTRE"].includes(role);
};

// Liste publique des medias publies et approuves
const getPublishedMedia = async (req, res, next) => {
  try {
    const { type, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      isPublished: true,
      isApproved: true,
      isHidden: false,
    };
    if (type) where.type = type;

    const [media, total] = await Promise.all([
      prisma.media.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          description: true,
          type: true,
          url: true,
          thumbnailUrl: true,
          fileSize: true,
          duration: true,
          createdAt: true,
          author: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      }),
      prisma.media.count({ where }),
    ]);

    res.json({
      success: true,
      data: media,
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

// Detail d'un media
const getMediaById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const media = await prisma.media.findUnique({
      where: { id },
      include: {
        author: {
          select: { id: true, firstName: true, lastName: true, role: true },
        },
      },
    });

    if (!media || media.isHidden) {
      throw ApiError.notFound("Media introuvable");
    }

    res.json({ success: true, data: media });
  } catch (error) {
    next(error);
  }
};

// Publier un media
const createMedia = async (req, res, next) => {
  try {
    const authorId = req.user.userId;
    const authorRole = req.user.role;

    if (!canPublish(authorRole)) {
      throw ApiError.forbidden("Seuls les administrateurs, apotres et pasteurs peuvent publier");
    }

    const { title, description, type, url, thumbnailUrl, fileSize, duration, mimeType } = req.body;

    // Les pasteurs ont besoin d'approbation, les admin et apotres sont approuves directement
    const needsApproval = authorRole === "PASTEUR";
    const isApproved = !needsApproval;
    const isPublished = !needsApproval;

    const media = await prisma.media.create({
      data: {
        title,
        description,
        type,
        url,
        thumbnailUrl,
        fileSize: fileSize ? parseInt(fileSize) : undefined,
        duration,
        mimeType,
        isPublished,
        isApproved,
        authorId,
      },
    });

    res.status(201).json({
      success: true,
      message: needsApproval
        ? "Media soumis pour approbation. En attente de validation."
        : "Media publie avec succes",
      data: media,
    });
  } catch (error) {
    next(error);
  }
};

// Approuver un media (admin et apotres seulement)
const approveMedia = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    if (!canManage(req.user.role)) {
      throw ApiError.forbidden("Seuls les administrateurs et apotres peuvent approuver");
    }

    const media = await prisma.media.findUnique({ where: { id } });
    if (!media) {
      throw ApiError.notFound("Media introuvable");
    }

    const updated = await prisma.media.update({
      where: { id },
      data: {
        isApproved: true,
        isPublished: true,
        approvedBy: userId,
        approvedAt: new Date(),
      },
    });

    res.json({
      success: true,
      message: "Media approuve et publie avec succes",
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

// Modifier un media (admin et apotres seulement)
const updateMedia = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!canManage(req.user.role)) {
      throw ApiError.forbidden("Seuls les administrateurs et apotres peuvent modifier");
    }

    const media = await prisma.media.findUnique({ where: { id } });
    if (!media) {
      throw ApiError.notFound("Media introuvable");
    }

    const { title, description, url, thumbnailUrl } = req.body;

    const updated = await prisma.media.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(url !== undefined && { url }),
        ...(thumbnailUrl !== undefined && { thumbnailUrl }),
      },
    });

    res.json({
      success: true,
      message: "Media modifie avec succes",
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

// Supprimer un media (admin et apotres seulement)
const deleteMedia = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!canManage(req.user.role)) {
      throw ApiError.forbidden("Seuls les administrateurs et apotres peuvent supprimer");
    }

    const media = await prisma.media.findUnique({ where: { id } });
    if (!media) {
      throw ApiError.notFound("Media introuvable");
    }

    await prisma.media.delete({ where: { id } });

    res.json({ success: true, message: "Media supprime avec succes" });
  } catch (error) {
    next(error);
  }
};

// Masquer/Afficher un media (admin et apotres seulement)
const toggleVisibility = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!canManage(req.user.role)) {
      throw ApiError.forbidden("Seuls les administrateurs et apotres peuvent masquer");
    }

    const media = await prisma.media.findUnique({ where: { id } });
    if (!media) {
      throw ApiError.notFound("Media introuvable");
    }

    const updated = await prisma.media.update({
      where: { id },
      data: {
        isHidden: !media.isHidden,
        hiddenAt: media.isHidden ? null : new Date(),
      },
    });

    res.json({
      success: true,
      message: updated.isHidden ? "Media masque" : "Media visible",
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

// Liste d'attente des medias en attente d'approbation (admin et apotres)
const getPendingApproval = async (req, res, next) => {
  try {
    if (!canManage(req.user.role)) {
      throw ApiError.forbidden("Acces reserve aux administrateurs et apotres");
    }

    const media = await prisma.media.findMany({
      where: { isApproved: false, isHidden: false },
      orderBy: { createdAt: "asc" },
      include: {
        author: {
          select: { id: true, firstName: true, lastName: true, role: true },
        },
      },
    });

    res.json({ success: true, data: media });
  } catch (error) {
    next(error);
  }
};

module.exports = { getPublishedMedia, getMediaById, createMedia, approveMedia, updateMedia, deleteMedia, toggleVisibility, getPendingApproval };
