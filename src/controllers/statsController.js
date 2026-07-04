const prisma = require("../config/database");

const now = new Date();
const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
const startOfWeek = new Date(now);
startOfWeek.setDate(now.getDate() - now.getDay());
startOfWeek.setHours(0, 0, 0, 0);
const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

const countSince = (model, dateField, date) => {
  if (model === "user") return prisma.user.count({ where: { createdAt: { gte: date } } });
  if (model === "donation") return prisma.donation.count({ where: { createdAt: { gte: date } } });
  if (model === "event") return prisma.event.count({ where: { createdAt: { gte: date } } });
  if (model === "pageView") return prisma.pageView.count({ where: { visitedAt: { gte: date } } });
  if (model === "postRead") return prisma.postRead.count({ where: { readAt: { gte: date } } });
  if (model === "subscription") return prisma.subscription.count({ where: { createdAt: { gte: date } } });
  if (model === "contact") return prisma.contactMessage.count({ where: { createdAt: { gte: date } } });
  return 0;
};

const getDashboardStats = async (req, res, next) => {
  try {
    const [
      totalUsers, usersByRole, newUsersMonth, newUsersWeek,
      totalEvents, eventsByStatus, upcomingEvents,
      totalDonations, donationsMonth, donationAmount, donationByMethod,
      totalPageViews, pageViewsToday, pageViewsMonth, pageViewsWeek,
      totalPostReads, postReadsMonth,
      totalPosts, totalPrograms, totalMedia, totalSermons, totalPrayers, totalMorningPrayers,
      totalChurches,
      totalSubs, subsMonth,
      totalMessages, unreadMessages,
      activeLive,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.groupBy({ by: ["role"], _count: { id: true } }),
      countSince("user", "createdAt", startOfMonth),
      countSince("user", "createdAt", startOfWeek),
      prisma.event.count(),
      prisma.event.groupBy({ by: ["status"], _count: { id: true } }),
      prisma.event.findMany({ where: { status: { not: "TERMINE" } }, select: { id: true, title: true, date: true }, orderBy: { date: "asc" }, take: 10 }),
      prisma.donation.count(),
      countSince("donation", "createdAt", startOfMonth),
      prisma.donation.aggregate({ _sum: { amount: true } }),
      prisma.donation.groupBy({ by: ["paymentMethod"], _count: { id: true }, _sum: { amount: true } }),
      prisma.pageView.count(),
      countSince("pageView", "visitedAt", startOfToday),
      countSince("pageView", "visitedAt", startOfMonth),
      countSince("pageView", "visitedAt", startOfWeek),
      prisma.postRead.count(),
      countSince("postRead", "readAt", startOfMonth),
      prisma.post.count(),
      prisma.program.count(),
      prisma.media.count(),
      prisma.sermon.count(),
      prisma.prayerRequest.count(),
      prisma.morningPrayer.count(),
      prisma.church.count(),
      prisma.subscription.count({ where: { isActive: true } }),
      countSince("subscription", "createdAt", startOfMonth),
      prisma.contactMessage.count(),
      prisma.contactMessage.count({ where: { isRead: false } }),
      prisma.liveStream.findFirst({ where: { status: "EN_DIRECT", isActive: true }, select: { id: true, title: true } }),
    ]);

    res.json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          byRole: usersByRole.map((r) => ({ role: r.role, count: r._count.id })),
          newThisMonth: newUsersMonth,
          newThisWeek: newUsersWeek,
        },
        events: {
          total: totalEvents,
          byStatus: eventsByStatus.map((e) => ({ status: e.status, count: e._count.id })),
          upcoming: upcomingEvents,
        },
        donations: {
          total: totalDonations,
          totalAmount: donationAmount._sum.amount || 0,
          thisMonth: donationsMonth,
          byMethod: donationByMethod.map((d) => ({
            method: d.paymentMethod || "AUCUN",
            count: d._count.id,
            total: d._sum.amount || 0,
          })),
        },
        traffic: {
          totalPageViews,
          today: pageViewsToday,
          thisWeek: pageViewsWeek,
          thisMonth: pageViewsMonth,
          totalPostReads,
          postReadsThisMonth: postReadsMonth,
        },
        content: {
          posts: totalPosts,
          programs: totalPrograms,
          media: totalMedia,
          sermons: totalSermons,
          prayers: totalPrayers,
          morningPrayers: totalMorningPrayers,
        },
        churches: totalChurches,
        subscriptions: {
          active: totalSubs,
          newThisMonth: subsMonth,
        },
        contacts: {
          total: totalMessages,
          unread: unreadMessages,
        },
        live: activeLive,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getGeneralStats = async (req, res, next) => {
  try {
    const [totalUsers, totalChurches, totalEvents, totalDonations, totalDonationAmount, totalPrograms, totalMedia, totalPosts, totalPrayers, totalSermons, totalMorningPrayers, usersByRole, activeEvents] = await Promise.all([
      prisma.user.count(),
      prisma.church.count(),
      prisma.event.count(),
      prisma.donation.count(),
      prisma.donation.aggregate({ _sum: { amount: true } }),
      prisma.program.count(),
      prisma.media.count(),
      prisma.post.count(),
      prisma.prayerRequest.count(),
      prisma.sermon.count(),
      prisma.morningPrayer.count(),
      prisma.user.groupBy({ by: ["role"], _count: { id: true } }),
      prisma.event.findMany({ where: { status: "PLANIFIE" }, select: { id: true, title: true, date: true }, orderBy: { date: "asc" }, take: 5 }),
    ]);

    res.json({
      success: true,
      data: {
        users: { total: totalUsers, byRole: usersByRole.map((r) => ({ role: r.role, count: r._count.id })) },
        churches: totalChurches,
        events: { total: totalEvents, upcoming: activeEvents },
        donations: { total: totalDonations, totalAmount: totalDonationAmount._sum.amount || 0 },
        programs: totalPrograms, media: totalMedia, posts: totalPosts, prayers: totalPrayers,
        sermons: totalSermons, morningPrayers: totalMorningPrayers,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getChurchStats = async (req, res, next) => {
  try {
    const { churchId } = req.params;

    const church = await prisma.church.findUnique({ where: { id: churchId } });
    if (!church) return res.status(404).json({ success: false, message: "Eglise introuvable" });

    const [totalMembers, totalEvents, totalDonations, totalDonationAmount, membersByRole, upcomingEvents] = await Promise.all([
      prisma.user.count({ where: { churchId } }),
      prisma.event.count({ where: { churchId } }),
      prisma.donation.count({ where: { churchId } }),
      prisma.donation.aggregate({ where: { churchId }, _sum: { amount: true } }),
      prisma.user.groupBy({ by: ["role"], where: { churchId }, _count: { id: true } }),
      prisma.event.findMany({ where: { churchId, status: "PLANIFIE" }, select: { id: true, title: true, date: true }, orderBy: { date: "asc" }, take: 5 }),
    ]);

    res.json({
      success: true,
      data: {
        church: { id: church.id, name: church.name, city: church.city, logoUrl: church.logoUrl },
        members: { total: totalMembers, byRole: membersByRole.map((r) => ({ role: r.role, count: r._count.id })) },
        events: { total: totalEvents, upcoming: upcomingEvents },
        donations: { total: totalDonations, totalAmount: totalDonationAmount._sum.amount || 0 },
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getDashboardStats, getGeneralStats, getChurchStats };
