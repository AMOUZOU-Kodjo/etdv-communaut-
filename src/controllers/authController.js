const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const prisma = require("../config/database");
const ApiError = require("../utils/apiError");
const { sendOtpEmail } = require("../utils/email");
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} = require("../utils/generateTokens");

// Envoie un code OTP a l'email pour connexion sans mot de passe
const sendOtp = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) throw ApiError.badRequest("Email requis");

    const code = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await prisma.otp.create({ data: { email, code, expiresAt } });
    await sendOtpEmail(email, code);

    res.json({ success: true, message: "Code de verification envoye par email" });
  } catch (error) {
    next(error);
  }
};

// Verifie le code OTP et connecte ou cree le compte
const verifyOtp = async (req, res, next) => {
  try {
    const { email, code, firstName, lastName, phone } = req.body;
    if (!email || !code) throw ApiError.badRequest("Email et code requis");

    const otp = await prisma.otp.findFirst({
      where: { email, code, isUsed: false, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    });
    if (!otp) throw ApiError.unauthorized("Code invalide ou expire");

    await prisma.otp.update({ where: { id: otp.id }, data: { isUsed: true, usedAt: new Date() } });

    const existingUser = await prisma.user.findUnique({ where: { email } });
    let isNewUser = false;

    if (!existingUser) {
      if (!firstName || !lastName) throw ApiError.badRequest("Prenom et nom requis pour creer un compte");
      user = await prisma.user.create({
        data: { email, firstName, lastName, phone, role: "VISITEUR" },
      });
      isNewUser = true;
    } else {
      user = existingUser;
    }

    if (!user.isActive) throw ApiError.forbidden("Ce compte est desactive");

    const accessToken = generateAccessToken(user.id, user.role);
    const refreshToken = generateRefreshToken(user.id, user.role);

    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: hashedRefreshToken },
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      message: isNewUser ? "Compte cree avec succes" : "Connexion reussie",
      data: {
        user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, phone: user.phone, role: user.role, churchId: user.churchId },
        accessToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Creation d'un nouveau compte utilisateur
const register = async (req, res, next) => {
  try {
    const { email, password, firstName, lastName, phone, churchId, role } = req.body;

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
        ...(role && { role }),
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

    const accessToken = generateAccessToken(user.id, user.role);
    const refreshToken = generateRefreshToken(user.id, user.role);

    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: hashedRefreshToken },
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(201).json({
      success: true,
      message: "Compte cree avec succes",
      data: { accessToken, user },
    });
  } catch (error) {
    next(error);
  }
};

// Connexion avec email et mot de passe, retourne accessToken + refreshToken
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw ApiError.unauthorized("Email ou mot de passe incorrect");
    }

    if (!user.isActive) {
      throw ApiError.forbidden("Ce compte est desactive");
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw ApiError.unauthorized("Email ou mot de passe incorrect");
    }

    const accessToken = generateAccessToken(user.id, user.role);
    const refreshToken = generateRefreshToken(user.id, user.role);

    // Stocke le refresh token hashe en base de donnees
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: hashedRefreshToken },
    });

    // Envoie le refresh token dans un cookie httpOnly (securise)
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      message: "Connexion reussie",
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          role: user.role,
          churchId: user.churchId,
        },
        accessToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Renouvelle l'accessToken a partir du refreshToken
const refresh = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

    if (!refreshToken) {
      throw ApiError.unauthorized("Refresh token manquant");
    }

    const decoded = verifyRefreshToken(refreshToken);

    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user || !user.refreshToken) {
      throw ApiError.unauthorized("Refresh token invalide");
    }

    const isValidRefresh = await bcrypt.compare(refreshToken, user.refreshToken);
    if (!isValidRefresh) {
      throw ApiError.unauthorized("Refresh token invalide");
    }

    const newAccessToken = generateAccessToken(user.id, user.role);
    const newRefreshToken = generateRefreshToken(user.id, user.role);

    // Rotation du refresh token : ancien remplace par le nouveau
    const hashedNewRefresh = await bcrypt.hash(newRefreshToken, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: hashedNewRefresh },
    });

    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      data: { accessToken: newAccessToken },
    });
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return next(ApiError.unauthorized("Refresh token expire"));
    }
    if (error.name === "JsonWebTokenError") {
      return next(ApiError.unauthorized("Refresh token invalide"));
    }
    next(error);
  }
};

// Deconnexion : supprime le refresh token de la base et le cookie
const logout = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (refreshToken) {
      try {
        const decoded = verifyRefreshToken(refreshToken);
        await prisma.user.update({
          where: { id: decoded.userId },
          data: { refreshToken: null },
        });
      } catch (e) {
        // Ne pas bloquer la deconnexion si le token est deja invalide
      }
    }

    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    res.json({
      success: true,
      message: "Deconnexion reussie",
    });
  } catch (error) {
    next(error);
  }
};

// Retourne le profil de l'utilisateur connecte
const me = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        profile: true,
      },
    });

    if (!user) {
      throw ApiError.notFound("Utilisateur introuvable");
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { sendOtp, verifyOtp, register, login, refresh, logout, me };
