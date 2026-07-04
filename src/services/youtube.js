const prisma = require("../config/database");

const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";

const fetchFromYouTube = async (endpoint, params) => {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey || apiKey.startsWith("votre-")) return [];

  const url = new URL(`${YOUTUBE_API_BASE}/${endpoint}`);
  url.searchParams.set("key", apiKey);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));

  const res = await fetch(url.toString());
  if (!res.ok) {
    console.warn(`YouTube API error: ${res.status}`);
    return [];
  }
  const data = await res.json();
  return data.items || [];
};

const syncYouTubeChannel = async () => {
  const channelId = process.env.YOUTUBE_CHANNEL_ID;
  if (!channelId || channelId.startsWith("votre-")) return [];

  // Recupere les 10 dernieres videos de la chaine
  const items = await fetchFromYouTube("search", {
    channelId,
    part: "snippet",
    order: "date",
    maxResults: 10,
    type: "video",
  });

  const synced = [];

  for (const item of items) {
    const videoId = item.id?.videoId;
    if (!videoId) continue;

    const existing = await prisma.liveStream.findFirst({
      where: { youtubeVideoId: videoId },
    });
    if (existing) continue;

    const snippet = item.snippet;
    const isLive = snippet?.liveBroadcastContent === "live";
    const isUpcoming = snippet?.liveBroadcastContent === "upcoming";

    const stream = await prisma.liveStream.create({
      data: {
        title: snippet?.title || "Video YouTube",
        description: snippet?.description || "",
        type: "YOUTUBE",
        status: isLive ? "EN_DIRECT" : isUpcoming ? "PLANIFIE" : "TERMINE",
        youtubeVideoId: videoId,
        youtubeChannelId: channelId,
        embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}`,
        thumbnailUrl: snippet?.thumbnails?.high?.url || snippet?.thumbnails?.default?.url,
        scheduledAt: isUpcoming ? new Date(snippet?.publishedAt) : null,
        authorId: null, // sera assigne manuellement
      },
    });

    synced.push(stream);
  }

  return synced;
};

const getYouTubeVideoDetails = async (videoId) => {
  const items = await fetchFromYouTube("videos", {
    id: videoId,
    part: "snippet,liveStreamingDetails",
  });

  if (!items.length) return null;

  const item = items[0];
  const snippet = item.snippet;
  const liveDetails = item.liveStreamingDetails || {};

  return {
    title: snippet?.title,
    description: snippet?.description,
    thumbnail: snippet?.thumbnails?.high?.url,
    scheduledAt: liveDetails.scheduledStartTime ? new Date(liveDetails.scheduledStartTime) : null,
    actualStartTime: liveDetails.actualStartTime ? new Date(liveDetails.actualStartTime) : null,
    actualEndTime: liveDetails.actualEndTime ? new Date(liveDetails.actualEndTime) : null,
    concurrentViewers: liveDetails.concurrentViewers ? parseInt(liveDetails.concurrentViewers) : null,
  };
};

module.exports = { syncYouTubeChannel, getYouTubeVideoDetails };
