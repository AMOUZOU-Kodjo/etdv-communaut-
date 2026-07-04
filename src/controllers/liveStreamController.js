const prisma = require("../config/database");
const ApiError = require("../utils/apiError");
const { sendRealtimeNotification } = require("../config/socket");
const { syncYouTubeChannel, getYouTubeVideoDetails } = require("../services/youtube");

// Creation manuelle d'une diffusion (interne ou reference YouTube)
const createLiveStream = async (req, res, next) => {
  try {
    const { title, description, type, streamUrl, youtubeVideoId, scheduledAt, thumbnailUrl } = req.body;

    let embedUrl = null;
    let youtubeChannelId = null;

    if (type === "YOUTUBE" && youtubeVideoId) {
      embedUrl = `https://www.youtube-nocookie.com/embed/${youtubeVideoId}`;
      youtubeChannelId = process.env.YOUTUBE_CHANNEL_ID;
    }

    const stream = await prisma.liveStream.create({
      data: {
        title,
        description,
        type: type || "INTERNE",
        status: "PLANIFIE",
        streamUrl: type === "INTERNE" ? streamUrl : null,
        youtubeVideoId: type === "YOUTUBE" ? youtubeVideoId : null,
        youtubeChannelId,
        embedUrl,
        thumbnailUrl,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        authorId: req.user.userId,
      },
    });

    res.status(201).json({ success: true, data: stream });
  } catch (error) {
    next(error);
  }
};

// Lister les diffusions
const getLiveStreams = async (req, res, next) => {
  try {
    const { status, type, page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = { isActive: true };
    if (status) where.status = status;
    if (type) where.type = type;

    const [streams, total] = await Promise.all([
      prisma.liveStream.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: [{ status: "asc" }, { scheduledAt: "desc" }],
        include: {
          author: { select: { id: true, firstName: true, lastName: true, role: true } },
        },
      }),
      prisma.liveStream.count({ where }),
    ]);

    res.json({
      success: true,
      data: streams,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (error) {
    next(error);
  }
};

// Diffusion en cours (live)
const getCurrentLive = async (req, res, next) => {
  try {
    const stream = await prisma.liveStream.findFirst({
      where: { status: "EN_DIRECT", isActive: true },
      orderBy: { startedAt: "desc" },
      include: {
        author: { select: { id: true, firstName: true, lastName: true, role: true } },
      },
    });

    res.json({ success: true, data: stream });
  } catch (error) {
    next(error);
  }
};

const getLiveStreamById = async (req, res, next) => {
  try {
    const stream = await prisma.liveStream.findUnique({
      where: { id: req.params.id },
      include: {
        author: { select: { id: true, firstName: true, lastName: true, role: true } },
      },
    });
    if (!stream) throw ApiError.notFound("Diffusion introuvable");
    res.json({ success: true, data: stream });
  } catch (error) {
    next(error);
  }
};

// Demarrer / mettre a jour une diffusion
const updateLiveStream = async (req, res, next) => {
  try {
    const stream = await prisma.liveStream.findUnique({ where: { id: req.params.id } });
    if (!stream) throw ApiError.notFound("Diffusion introuvable");

    if (req.user.role !== "ADMIN" && req.user.role !== "APOTRE" && stream.authorId !== req.user.userId) {
      throw ApiError.forbidden("Vous ne pouvez modifier que vos diffusions");
    }

    const { title, description, status, streamUrl, youtubeVideoId, scheduledAt, thumbnailUrl, isActive } = req.body;

    let embedUrl = stream.embedUrl;
    if (youtubeVideoId) {
      embedUrl = `https://www.youtube-nocookie.com/embed/${youtubeVideoId}`;
    }

    const updated = await prisma.liveStream.update({
      where: { id: req.params.id },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(status && { status, ...(status === "EN_DIRECT" && { startedAt: new Date() }), ...(status === "TERMINE" && { endedAt: new Date() }) }),
        ...(streamUrl !== undefined && { streamUrl }),
        ...(youtubeVideoId !== undefined && { youtubeVideoId, embedUrl }),
        ...(scheduledAt !== undefined && { scheduledAt: scheduledAt ? new Date(scheduledAt) : null }),
        ...(thumbnailUrl !== undefined && { thumbnailUrl }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    // Notifie tout le monde si le direct commence
    if (status === "EN_DIRECT" && stream.status !== "EN_DIRECT") {
      const siteUrl = process.env.CLIENT_URL || "http://localhost:5173";
      const link = `${siteUrl}/live/${updated.id}`;

      const allUsers = await prisma.user.findMany({
        where: { isActive: true },
        select: { id: true },
      });

      for (const user of allUsers) {
        await sendRealtimeNotification(user.id, {
          type: "LIVE",
          title: `En direct : ${updated.title}`,
          content: "Une diffusion en direct vient de commencer !",
          link,
          senderId: req.user.userId,
          relatedId: updated.id,
        });
      }
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

const deleteLiveStream = async (req, res, next) => {
  try {
    const stream = await prisma.liveStream.findUnique({ where: { id: req.params.id } });
    if (!stream) throw ApiError.notFound("Diffusion introuvable");

    if (req.user.role !== "ADMIN" && req.user.role !== "APOTRE" && stream.authorId !== req.user.userId) {
      throw ApiError.forbidden("Vous ne pouvez supprimer que vos diffusions");
    }

    await prisma.liveStream.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: "Diffusion supprimee" });
  } catch (error) {
    next(error);
  }
};

// Synchronise les videos de la chaine YouTube
const syncFromYouTube = async (req, res, next) => {
  try {
    const synced = await syncYouTubeChannel();
    res.json({ success: true, message: `${synced.length} nouvelle(s) video(s) synchronisee(s)`, data: synced });
  } catch (error) {
    next(error);
  }
};

// Recupere les details YouTube d'une video
const checkYouTubeVideo = async (req, res, next) => {
  try {
    const { videoId } = req.params;
    const details = await getYouTubeVideoDetails(videoId);
    if (!details) throw ApiError.notFound("Video YouTube introuvable");
    res.json({ success: true, data: details });
  } catch (error) {
    next(error);
  }
};

module.exports = { createLiveStream, getLiveStreams, getCurrentLive, getLiveStreamById, updateLiveStream, deleteLiveStream, syncFromYouTube, checkYouTubeVideo };
