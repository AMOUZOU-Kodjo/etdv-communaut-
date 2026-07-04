const prisma = require("../config/database");
const ApiError = require("../utils/apiError");
const { sendEmail } = require("../utils/email");

const siteUrl = process.env.CLIENT_URL || "http://localhost:5173";

// Envoyer un message de contact (public, sans auth)
const sendContactMessage = async (req, res, next) => {
  try {
    const { name, email, subject, message, recipientType, recipientId } = req.body;
    if (!name || !email || !message) throw ApiError.badRequest("Nom, email et message requis");

    if (recipientType === "PASTEUR" && recipientId) {
      const pastor = await prisma.user.findUnique({ where: { id: recipientId } });
      if (!pastor || pastor.role !== "PASTEUR") throw ApiError.notFound("Pasteur introuvable");
    }

    const msg = await prisma.contactMessage.create({
      data: { name, email, subject, message, recipientType: recipientType || "APOTRE", recipientId },
    });

    // Envoie un email de notification au destinataire
    const recipientEmail = recipientType === "PASTEUR" && recipientId
      ? (await prisma.user.findUnique({ where: { id: recipientId } }))?.email
      : process.env.EMAIL_FROM;

    if (recipientEmail) {
      await sendEmail({
        to: recipientEmail,
        subject: subject || `Message de ${name} via ETDV-Communaute`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px;">
            <h2>Nouveau message de contact</h2>
            <p><strong>De :</strong> ${name} (${email})</p>
            <p><strong>Sujet :</strong> ${subject || "Aucun"}</p>
            <p><strong>Message :</strong></p>
            <blockquote style="border-left:4px solid #3182ce;padding-left:16px;color:#333;">${message}</blockquote>
            <hr>
            <p style="color:#718096;font-size:12px;">Envoye depuis ETDV-Communaute</p>
          </div>
        `,
      });
    }

    res.status(201).json({ success: true, message: "Message envoye avec succes", data: msg });
  } catch (error) {
    next(error);
  }
};

// Lister les messages de contact (ADMIN, APOTRE, pasteur concerne)
const getContactMessages = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const userRole = req.user.role;
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (userRole !== "ADMIN" && userRole !== "APOTRE") {
      where.recipientType = "PASTEUR";
      // Un pasteur ne voit que les messages qui lui sont adresses
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
      if (user?.role === "PASTEUR") {
        where.recipientId = userId;
      } else {
        where.recipientId = userId;
      }
    }

    const [messages, total] = await Promise.all([
      prisma.contactMessage.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: "desc" },
      }),
      prisma.contactMessage.count({ where }),
    ]);

    res.json({
      success: true,
      data: messages,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (error) {
    next(error);
  }
};

// Marquer un message comme lu
const markContactAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const msg = await prisma.contactMessage.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });
    res.json({ success: true, data: msg });
  } catch (error) {
    next(error);
  }
};

// Supprimer un message
const deleteContactMessage = async (req, res, next) => {
  try {
    await prisma.contactMessage.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: "Message supprime" });
  } catch (error) {
    next(error);
  }
};

module.exports = { sendContactMessage, getContactMessages, markContactAsRead, deleteContactMessage };
