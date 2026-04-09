import http from "http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import app from "./app.js";

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

// 🔥 make io globally available
global.io = io;

io.use((socket, next) => {
  try {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers.authorization?.split(" ")[1];

    if (!token) {
      return next(new Error("Authentication required"));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded;
    next();
  } catch (error) {
    next(new Error("Invalid token"));
  }
});

io.on("connection", (socket) => {
  socket.join(`user:${socket.user.id}`);
  console.log("User connected:", socket.id);
});

const PORT = 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
