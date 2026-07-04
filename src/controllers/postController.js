const prisma = require("../config/database");
const ApiError = require("../utils/apiError");

const createPost = async (req, res, next) => {
  try {
    const { title, content, excerpt, imageUrl, categoryId } = req.body;

    const post = await prisma.post.create({
      data: {
        title,
        content,
        excerpt,
        imageUrl,
        categoryId,
        authorId: req.user.userId,
        isPublished: true,
        publishedAt: new Date(),
      },
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
        category: { select: { id: true, name: true } },
      },
    });

    res.status(201).json({ success: true, data: post });
  } catch (error) {
    next(error);
  }
};

const getPosts = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, categoryId, authorId } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = { isPublished: true };
    if (categoryId) where.categoryId = categoryId;
    if (authorId) where.authorId = authorId;

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { publishedAt: "desc" },
        include: {
          author: { select: { id: true, firstName: true, lastName: true, role: true } },
          category: { select: { id: true, name: true } },
          _count: { select: { reads: true } },
        },
      }),
      prisma.post.count({ where }),
    ]);

    res.json({
      success: true,
      data: posts,
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

const getPostById = async (req, res, next) => {
  try {
    const post = await prisma.post.findUnique({
      where: { id: req.params.id },
      include: {
        author: { select: { id: true, firstName: true, lastName: true, role: true } },
        category: { select: { id: true, name: true } },
        _count: { select: { reads: true } },
      },
    });
    if (!post) throw ApiError.notFound("Publication introuvable");
    res.json({ success: true, data: post });
  } catch (error) {
    next(error);
  }
};

const updatePost = async (req, res, next) => {
  try {
    const { title, content, excerpt, imageUrl, categoryId, isPublished } = req.body;

    const post = await prisma.post.findUnique({ where: { id: req.params.id } });
    if (!post) throw ApiError.notFound("Publication introuvable");

    if (req.user.role !== "ADMIN" && req.user.role !== "APOTRE" && post.authorId !== req.user.userId) {
      throw ApiError.forbidden("Vous ne pouvez modifier que vos propres publications");
    }

    const updated = await prisma.post.update({
      where: { id: req.params.id },
      data: {
        ...(title && { title }),
        ...(content && { content }),
        ...(excerpt !== undefined && { excerpt }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(categoryId && { categoryId }),
        ...(isPublished !== undefined && { isPublished }),
      },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

const deletePost = async (req, res, next) => {
  try {
    const post = await prisma.post.findUnique({ where: { id: req.params.id } });
    if (!post) throw ApiError.notFound("Publication introuvable");

    if (req.user.role !== "ADMIN" && req.user.role !== "APOTRE" && post.authorId !== req.user.userId) {
      throw ApiError.forbidden("Vous ne pouvez supprimer que vos propres publications");
    }

    await prisma.post.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: "Publication supprimee" });
  } catch (error) {
    next(error);
  }
};

// Marquer un post comme lu
const markPostAsRead = async (req, res, next) => {
  try {
    const postId = req.params.id;
    const userId = req.user.userId;

    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw ApiError.notFound("Publication introuvable");

    await prisma.postRead.upsert({
      where: { postId_userId: { postId, userId } },
      update: {},
      create: { postId, userId },
    });

    res.json({ success: true, message: "Marque comme lu" });
  } catch (error) {
    next(error);
  }
};

// Lister les lecteurs d'un post
const getPostReaders = async (req, res, next) => {
  try {
    const postId = req.params.id;

    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw ApiError.notFound("Publication introuvable");

    if (req.user.role !== "ADMIN" && req.user.role !== "APOTRE" && req.user.role !== "PASTEUR") {
      throw ApiError.forbidden("Seuls les responsables peuvent voir les lecteurs");
    }

    const readers = await prisma.postRead.findMany({
      where: { postId },
      orderBy: { readAt: "desc" },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, role: true } },
      },
    });

    res.json({ success: true, data: readers, total: readers.length });
  } catch (error) {
    next(error);
  }
};

module.exports = { createPost, getPosts, getPostById, updatePost, deletePost, markPostAsRead, getPostReaders };
