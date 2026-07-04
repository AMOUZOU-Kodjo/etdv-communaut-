const { Server } = require("socket.io");

let io = null;
const onlineUsers = new Map();

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:5173",
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log("Client connecte:", socket.id);

    // L'utilisateur rejoint sa room personnelle
    socket.on("join", (userId) => {
      if (userId) {
        socket.join(`user:${userId}`);
        onlineUsers.set(userId, (onlineUsers.get(userId) || 0) + 1);
        io.emit("presence:online", { userId, online: true });
        console.log(`User ${userId} joined room user:${userId}`);
      }
    });

    // Rejoint une room de conversation (pour les evenements en temps reel)
    socket.on("chat:join", (roomId) => {
      if (roomId) {
        socket.join(`room:${roomId}`);
        console.log(`Socket ${socket.id} joined chat room:${roomId}`);
      }
    });

    // Quitte une room de conversation
    socket.on("chat:leave", (roomId) => {
      if (roomId) {
        socket.leave(`room:${roomId}`);
      }
    });

    // L'utilisateur quitte sa room personnelle
    socket.on("leave", (userId) => {
      if (userId) {
        socket.leave(`user:${userId}`);
        const count = (onlineUsers.get(userId) || 1) - 1;
        if (count <= 0) {
          onlineUsers.delete(userId);
          io.emit("presence:online", { userId, online: false });
        } else {
          onlineUsers.set(userId, count);
        }
      }
    });

    socket.on("disconnect", () => {
      console.log("Client deconnecte:", socket.id);
    });
  });

  return io;
};

const sendRealtimeNotification = (userId, notification) => {
  if (io) {
    io.to(`user:${userId}`).emit("notification", notification);
  }
};

const broadcastEvent = (event, data) => {
  if (io) {
    io.emit(event, data);
  }
};

const getIO = () => io;

const isUserOnline = (userId) => onlineUsers.has(userId);

module.exports = { initSocket, sendRealtimeNotification, broadcastEvent, getIO, isUserOnline };
