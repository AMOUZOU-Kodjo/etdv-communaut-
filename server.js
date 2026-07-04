require("dotenv").config();
const http = require("http");
const app = require("./src/app");
const { initSocket } = require("./src/config/socket");

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

// Initialisation de Socket.io pour le temps reel
initSocket(server);

const startServer = async () => {
  try {
    const prisma = require("./src/config/database");
    await prisma.$connect();
    console.log("Connexion a la base de donnees reussie");
    await prisma.$disconnect();
  } catch (error) {
    console.error("Erreur de connexion a la base de donnees:", error.message);
    process.exit(1);
  }

  server.listen(PORT, () => {
    console.log(`Serveur demarre sur le port ${PORT}`);
    console.log(`Environnement: ${process.env.NODE_ENV || "development"}`);
    console.log(`API: http://localhost:${PORT}/api`);
  });
};

startServer();
