import http from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";
import app from "./app";

// 1. Load environment variables
dotenv.config();

// 2. Create the HTTP server (needed for Socket.io)
const server = http.createServer(app);

// 3. Initialize Socket.io (for Real-time Chat & Tracking)
const io = new Server(server, {
  cors: {
    origin: "*", // We will restrict this to 'http://localhost:5173' in production
    methods: ["GET", "POST"],
  },
});


// 4. Socket Event Listeners
io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Join personal room using userId
  socket.on("join", (userId: string) => {
    socket.join(userId);
    console.log(`User ${userId} joined their room`);
  });

  // Handle sending messages
  socket.on("sendMessage", (data: { senderId: string, receiverId: string, content: string, message: any }) => {
    io.to(data.receiverId).emit("newMessage", data.message);
    io.to(data.receiverId).emit("newNotification", { type: 'message', from: data.senderId });
  });

  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

// 5. Error Handling & Cleanup
const exitHandler = () => {
  if (server) {
    server.close(() => {
      console.log("Server closed");
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
};

const unexpectedErrorHandler = (error: unknown) => {
  console.error(error);
  exitHandler();
};

process.on("uncaughtException", unexpectedErrorHandler);
process.on("unhandledRejection", unexpectedErrorHandler);

// 6. Start the Server
const PORT = parseInt(process.env.PORT || "5001", 10);

server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 RouteMate Server firing up on port ${PORT}`);
});
