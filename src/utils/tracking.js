const prisma = require("../config/database");

const trackPageView = async ({ page, referrer, ip, userAgent, userId }) => {
  try {
    await prisma.pageView.create({ data: { page, referrer, ip, userAgent, userId } });
  } catch (e) {
    // Ne pas bloquer si le tracking echoue
  }
};

module.exports = { trackPageView };
