const prisma = require("../config/database");
const ApiError = require("../utils/apiError");
const { canSendMessage } = require("../utils/chatPermissions");
const { createNotification } = require("../utils/notificationHelper");
const { sendRealtimeNotification, getIO } = require("../config/socket");

// Cree ou recupere une conversation privee avec un autre utilisateur
const startOrGetConversation = async (req, res, next) => {
  try {
    const senderId = req.user.userId;
    const senderRole = req.user.role;
    const { recipientId } = req.body;

    if (!recipientId) {
      throw ApiError.badRequest("L'identifiant du destinataire est requis");
    }

    if (senderId === recipientId) {
      throw ApiError.badRequest("Vous ne pouvez pas vous envoyer un message a vous-meme");
    }

    const recipient = await prisma.user.findUnique({
      where: { id: recipientId },
      select: { id: true, role: true, isActive: true },
    });

    if (!recipient) throw ApiError.notFound("Destinataire introuvable");
    if (!recipient.isActive) throw ApiError.forbidden("Ce compte est desactive");

    if (!canSendMessage(senderRole, recipient.role)) {
      throw ApiError.forbidden("Vous n'avez pas le droit d'envoyer un message a cet utilisateur");
    }

    const existingRooms = await prisma.chatRoom.findMany({
      where: {
        AND: [
          { participants: { some: { userId: senderId } } },
          { participants: { some: { userId: recipientId } } },
        ],
      },
      include: {
        participants: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, role: true, profile: { select: { avatarUrl: true } } },
            },
          },
        },
        messages: {
          take: 1,
          orderBy: { createdAt: "desc" },
          include: {
            sender: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
    });

    if (existingRooms.length > 0) {
      return res.json({ success: true, data: existingRooms[0] });
    }

    const room = await prisma.chatRoom.create({
      data: {
        participants: {
          create: [{ userId: senderId }, { userId: recipientId }],
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, role: true, profile: { select: { avatarUrl: true } } },
            },
          },
        },
      },
    });

    res.status(201).json({ success: true, data: room });
  } catch (error) {
    next(error);
  }
};

// Envoie un message (texte, audio, image, video, lien)
const sendMessage = async (req, res, next) => {
  try {
    const senderId = req.user.userId;
    const senderRole = req.user.role;
    const { roomId } = req.params;
    const { content, messageType, mediaUrl, replyToId } = req.body;

    const room = await prisma.chatRoom.findUnique({
      where: { id: roomId },
      include: {
        participants: {
          include: { user: { select: { id: true, role: true } } },
        },
      },
    });

    if (!room) throw ApiError.notFound("Conversation introuvable");

    const isParticipant = room.participants.some((p) => p.userId === senderId);
    if (!isParticipant) throw ApiError.forbidden("Vous ne participez pas a cette conversation");

    for (const participant of room.participants) {
      if (participant.userId !== senderId) {
        if (!canSendMessage(senderRole, participant.user.role)) {
          throw ApiError.forbidden("Vous n'avez pas le droit d'envoyer un message dans cette conversation");
        }
      }
    }

    const msgType = messageType || "TEXTE";

    if (msgType === "TEXTE" && (!content || !content.trim())) {
      throw ApiError.badRequest("Le contenu du message est requis");
    }

    if (replyToId) {
      const replyMsg = await prisma.chatMessage.findUnique({ where: { id: replyToId } });
      if (!replyMsg || replyMsg.roomId !== roomId) {
        throw ApiError.badRequest("Message a repondre introuvable dans cette conversation");
      }
    }

    const message = await prisma.chatMessage.create({
      data: {
        roomId,
        senderId,
        messageType: msgType,
        content: content?.trim(),
        mediaUrl,
        replyToId,
      },
      include: {
        sender: { select: { id: true, firstName: true, lastName: true, role: true, profile: { select: { avatarUrl: true } } } },
        replyTo: {
          include: {
            sender: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
    });

    const sender = await prisma.user.findUnique({
      where: { id: senderId },
      select: { firstName: true, lastName: true },
    });

    const io = getIO();
    for (const participant of room.participants) {
      if (participant.userId !== senderId) {
        const notifData = {
          type: "MESSAGE",
          title: `Nouveau message de ${sender.firstName} ${sender.lastName}`,
          content: msgType === "TEXTE" ? (content || "").substring(0, 100) : msgType,
          link: `/chat/${roomId}`,
          senderId,
          relatedId: roomId,
        };
        await createNotification({ userId: participant.userId, ...notifData });
        sendRealtimeNotification(participant.userId, notifData);

        // Envoie aussi le message en temps reel aux participants connectes
        if (io) {
          io.to(`user:${participant.userId}`).emit("chat:message", message);
        }
      }
    }

    if (io) {
      io.to(`room:${roomId}`).emit("chat:message", message);
    }

    res.status(201).json({ success: true, data: message });
  } catch (error) {
    next(error);
  }
};

// Supprimer un message (soft delete, seulement le proprietaire)
const deleteMessage = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { messageId } = req.params;

    const message = await prisma.chatMessage.findUnique({ where: { id: messageId } });
    if (!message) throw ApiError.notFound("Message introuvable");
    if (message.senderId !== userId) throw ApiError.forbidden("Vous ne pouvez supprimer que vos propres messages");

    await prisma.chatMessage.update({
      where: { id: messageId },
      data: { isDeleted: true, content: null, mediaUrl: null },
    });

    const io = getIO();
    if (io) {
      io.to(`room:${message.roomId}`).emit("chat:delete", { id: messageId, roomId: message.roomId });
    }

    res.json({ success: true, message: "Message supprime" });
  } catch (error) {
    next(error);
  }
};

// Liste les conversations de l'utilisateur connecte
const getMyConversations = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const rooms = await prisma.chatRoom.findMany({
      where: { participants: { some: { userId } } },
      include: {
        participants: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, role: true, profile: { select: { avatarUrl: true } } },
            },
          },
        },
        messages: {
          take: 1,
          orderBy: { createdAt: "desc" },
          include: {
            sender: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    const roomsWithUnread = await Promise.all(
      rooms.map(async (room) => {
        const participant = room.participants.find((p) => p.userId === userId);
        const unreadCount = participant?.lastReadAt
          ? await prisma.chatMessage.count({
              where: {
                roomId: room.id,
                senderId: { not: userId },
                createdAt: { gt: participant.lastReadAt },
                isDeleted: false,
              },
            })
          : await prisma.chatMessage.count({
              where: { roomId: room.id, senderId: { not: userId }, isDeleted: false },
            });

        return { ...room, unreadCount };
      })
    );

    res.json({ success: true, data: roomsWithUnread });
  } catch (error) {
    next(error);
  }
};

// Recupere les messages d'une conversation
const getMessages = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { roomId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const isParticipant = await prisma.chatRoomParticipant.findUnique({
      where: { roomId_userId: { roomId, userId } },
    });

    if (!isParticipant) throw ApiError.forbidden("Vous ne participez pas a cette conversation");

    const [messages, total] = await Promise.all([
      prisma.chatMessage.findMany({
        where: { roomId },
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: "desc" },
        include: {
          sender: { select: { id: true, firstName: true, lastName: true, role: true, profile: { select: { avatarUrl: true } } } },
          replyTo: {
            include: {
              sender: { select: { id: true, firstName: true, lastName: true } },
            },
          },
        },
      }),
      prisma.chatMessage.count({ where: { roomId } }),
    ]);

    await prisma.chatRoomParticipant.update({
      where: { roomId_userId: { roomId, userId } },
      data: { lastReadAt: new Date() },
    });

    res.json({
      success: true,
      data: messages.reverse(),
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (error) {
    next(error);
  }
};

// Marque tous les messages d'une conversation comme lus
const markAsRead = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { roomId } = req.params;

    const participant = await prisma.chatRoomParticipant.findUnique({
      where: { roomId_userId: { roomId, userId } },
    });
    if (!participant) throw ApiError.forbidden("Vous ne participez pas a cette conversation");

    await prisma.chatRoomParticipant.update({
      where: { roomId_userId: { roomId, userId } },
      data: { lastReadAt: new Date() },
    });

    const io = getIO();
    if (io) {
      io.to(`room:${roomId}`).emit("chat:read", { userId, roomId });
    }

    res.json({ success: true, message: "Messages marques comme lus" });
  } catch (error) {
    next(error);
  }
};

module.exports = { startOrGetConversation, sendMessage, deleteMessage, getMyConversations, getMessages, markAsRead };
