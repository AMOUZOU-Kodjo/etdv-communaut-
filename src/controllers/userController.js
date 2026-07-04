const bcrypt = require("bcryptjs");
const prisma = require("../config/database");
const ApiError = require("../utils/apiError");

// Verifie si l'utilisateur connecte peut gerer le membre cible
const canManageUser = (actorRole, actorChurchId, targetUser) => {
  if (actorRole === "ADMIN") return true;
  if (actorRole === "APOTRE") return targetUser.role !== "ADMIN";
  if (actorRole === "PASTEUR") {
    return targetUser.role !== "ADMIN" && targetUser.role !== "APOTRE" && targetUser.churchId === actorChurchId;
  }
  return false;
};

// Ajoute les filtres selon le role pour la consultation
const addRoleFilters = async (actorRole, actorUserId, where) => {
  if (actorRole === "PASTEUR") {
    const actor = await prisma.user.findUnique({
      where: { id: actorUserId },
      select: { churchId: true },
    });
    where.churchId = actor.churchId;
    where.role = { notIn: ["ADMIN", "APOTRE"] };
  }
  if (actorRole === "APOTRE") {
    where.role = { not: "ADMIN" };
  }
};

// Liste paginee des utilisateurs avec filtres
const getUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, role, search, isActive } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (role) where.role = role;
    if (isActive !== undefined) where.isActive = isActive === "true";
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    await addRoleFilters(req.user.role, req.user.userId, where);

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: parseInt(limit),
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          role: true,
          isActive: true,
          createdAt: true,
          church: {
            select: { id: true, name: true, city: true },
          },
          profile: {
            select: {
              avatarUrl: true,
              city: true,
              ministry: true,
              gender: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      success: true,
      data: users,
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

// Detail d'un utilisateur par son ID
const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const viewerId = req.user.userId;

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      throw ApiError.notFound("Utilisateur introuvable");
    }

    if (!canManageUser(req.user.role, null, targetUser)) {
      throw ApiError.forbidden("Vous n'avez pas le droit de voir cet utilisateur");
    }

    // Enregistre la visite si ce n'est pas l'utilisateur lui-meme
    if (viewerId !== id) {
      await prisma.profileVisit.create({
        data: { profileId: id, visitorId: viewerId },
      });
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        isActive: true,
        churchId: true,
        createdAt: true,
        updatedAt: true,
        church: {
          select: { id: true, name: true, city: true },
        },
        profile: true,
        _count: {
          select: { profileVisits: true },
        },
      },
    });

    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

// Statistiques de visites du profil
const getProfileVisitStats = async (req, res, next) => {
  try {
    const profileId = req.params.id || req.user.userId;

    const targetUser = await prisma.user.findUnique({ where: { id: profileId } });
    if (!targetUser) throw ApiError.notFound("Utilisateur introuvable");

    if (req.user.role !== "ADMIN" && req.user.role !== "APOTRE" && req.user.role !== "PASTEUR") {
      throw ApiError.forbidden("Acces reserve aux responsables");
    }

    if (req.user.role !== "ADMIN" && req.user.role !== "APOTRE" && req.user.userId !== profileId) {
      throw ApiError.forbidden("Vous ne pouvez voir que les statistiques de votre propre profil");
    }

    const [totalVisits, uniqueVisitors, recentVisits] = await Promise.all([
      prisma.profileVisit.count({ where: { profileId } }),
      prisma.profileVisit.groupBy({
        by: ["visitorId"],
        where: { profileId, visitorId: { not: null } },
      }),
      prisma.profileVisit.findMany({
        where: { profileId },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          visitor: { select: { id: true, firstName: true, lastName: true, role: true } },
        },
      }),
    ]);

    res.json({
      success: true,
      data: {
        totalVisits,
        uniqueVisitors: uniqueVisitors.length,
        recentVisits,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Modification d'un utilisateur
const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, phone, email, role, isActive, churchId } = req.body;

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      throw ApiError.notFound("Utilisateur introuvable");
    }

    // Verifie les permissions selon le role de l'acteur
    if (!canManageUser(req.user.role, req.body.actorChurchId, targetUser)) {
      throw ApiError.forbidden("Vous n'avez pas le droit de modifier cet utilisateur");
    }

    // Un pasteur ne peut modifier que les membres de son eglise
    if (req.user.role === "PASTEUR") {
      const actor = await prisma.user.findUnique({
        where: { id: req.user.userId },
        select: { churchId: true },
      });
      if (targetUser.churchId !== actor.churchId) {
        throw ApiError.forbidden("Vous ne pouvez modifier que les membres de votre eglise");
      }
    }

    // Un apotre ne peut pas promouvoir quelqu'un en admin
    if (req.user.role === "APOTRE" && role === "ADMIN") {
      throw ApiError.forbidden("Seul un administrateur peut attribuer le role ADMIN");
    }

    if (email && email !== targetUser.email) {
      const emailExists = await prisma.user.findUnique({ where: { email } });
      if (emailExists) {
        throw ApiError.conflict("Cet email est deja utilise");
      }
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(phone !== undefined && { phone }),
        ...(email && { email }),
        ...(role && { role }),
        ...(isActive !== undefined && { isActive }),
        ...(churchId !== undefined && { churchId }),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        isActive: true,
        churchId: true,
      },
    });

    res.json({
      success: true,
      message: "Utilisateur mis a jour avec succes",
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

// Suppression definitive d'un utilisateur
const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      throw ApiError.notFound("Utilisateur introuvable");
    }

    if (!canManageUser(req.user.role, null, targetUser)) {
      throw ApiError.forbidden("Vous n'avez pas le droit de supprimer cet utilisateur");
    }

    if (req.user.role === "PASTEUR") {
      const actor = await prisma.user.findUnique({
        where: { id: req.user.userId },
        select: { churchId: true },
      });
      if (targetUser.churchId !== actor.churchId) {
        throw ApiError.forbidden("Vous ne pouvez supprimer que les membres de votre eglise");
      }
    }

    await prisma.user.delete({ where: { id } });

    res.json({ success: true, message: "Utilisateur supprime avec succes" });
  } catch (error) {
    next(error);
  }
};

// Mise a jour du profil de l'utilisateur connecte
const updateProfile = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { bio, address, dateOfBirth, gender, maritalStatus, ministry, baptismDate, profession, city, country, avatarUrl } = req.body;

    const profile = await prisma.profile.upsert({
      where: { userId },
      update: {
        ...(bio !== undefined && { bio }),
        ...(address !== undefined && { address }),
        ...(dateOfBirth !== undefined && { dateOfBirth: new Date(dateOfBirth) }),
        ...(gender !== undefined && { gender }),
        ...(maritalStatus !== undefined && { maritalStatus }),
        ...(ministry !== undefined && { ministry }),
        ...(baptismDate !== undefined && { baptismDate: new Date(baptismDate) }),
        ...(profession !== undefined && { profession }),
        ...(city !== undefined && { city }),
        ...(country !== undefined && { country }),
        ...(avatarUrl !== undefined && { avatarUrl }),
      },
      create: {
        userId,
        bio,
        address,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
        gender,
        maritalStatus,
        ministry: ministry || "AUCUN",
        baptismDate: baptismDate ? new Date(baptismDate) : undefined,
        profession,
        city,
        country,
        avatarUrl,
      },
    });

    res.json({
      success: true,
      message: "Profil mis a jour avec succes",
      data: profile,
    });
  } catch (error) {
    next(error);
  }
};

// Supprime la photo de profil
const deleteAvatar = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    await prisma.profile.upsert({
      where: { userId },
      update: { avatarUrl: null },
      create: { userId, ministry: "AUCUN" },
    });

    res.json({ success: true, message: "Photo de profil supprimee" });
  } catch (error) {
    next(error);
  }
};

// Changement de mot de passe
const changePassword = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { currentPassword, newPassword } = req.body;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw ApiError.notFound("Utilisateur introuvable");
    }

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      throw ApiError.badRequest("Mot de passe actuel incorrect");
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    res.json({ success: true, message: "Mot de passe modifie avec succes" });
  } catch (error) {
    next(error);
  }
};

// Creation d'un membre par un responsable
const createMember = async (req, res, next) => {
  try {
    const { email, password, firstName, lastName, phone, role, churchId } = req.body;
    const actorRole = req.user.role;

    // Un pasteur ne peut creer que des fideles ou visiteurs dans son eglise
    if (actorRole === "PASTEUR") {
      const actor = await prisma.user.findUnique({
        where: { id: req.user.userId },
        select: { churchId: true },
      });
      const targetChurchId = churchId || actor.churchId;
      if (targetChurchId !== actor.churchId) {
        throw ApiError.forbidden("Vous ne pouvez ajouter des membres que dans votre eglise");
      }
    }

    // Un apotre ne peut pas creer un admin
    if (actorRole === "APOTRE" && role === "ADMIN") {
      throw ApiError.forbidden("Seul un administrateur peut creer un compte ADMIN");
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw ApiError.conflict("Un compte avec cet email existe deja");
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        phone,
        role: role || "FIDELES",
        ...(churchId && { churchId }),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        churchId: true,
        createdAt: true,
      },
    });

    res.status(201).json({
      success: true,
      message: "Membre cree avec succes",
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getUsers, getUserById, getProfileVisitStats, updateUser, deleteUser, updateProfile, changePassword, createMember, deleteAvatar };
