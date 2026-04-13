const jwt = require("jsonwebtoken");
const { User } = require("../models/user");

// Map of userId -> Set of socketIds
const onlineUsers = new Map();

const initializeSocket = (io) => {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("Authentication required"));

      const decoded = jwt.verify(token, "Hero@586");
      const user = await User.findById(decoded._id).select(
        "firstName lastName photoUrl"
      );
      if (!user) return next(new Error("User not found"));

      socket.userId = user._id.toString();
      socket.userData = user;
      next();
    } catch (err) {
      next(new Error("Authentication failed"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.userId;

    // Track online status
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId).add(socket.id);

    // Join a personal room for direct messaging
    socket.join(userId);

    // Broadcast online status
    io.emit("userOnline", { userId });

    // Send current online users to newly connected client
    const onlineList = Array.from(onlineUsers.keys());
    socket.emit("onlineUsers", onlineList);

    // Handle sending messages via socket
    socket.on("sendMessage", ({ receiverId, text, tempId }) => {
      // Emit to receiver's room
      io.to(receiverId).emit("receiveMessage", {
        _id: tempId,
        senderId: userId,
        receiverId,
        text,
        createdAt: new Date().toISOString(),
        read: false,
        tempId,
      });
    });

    // Typing indicators
    socket.on("typing", ({ receiverId }) => {
      io.to(receiverId).emit("userTyping", { userId });
    });

    socket.on("stopTyping", ({ receiverId }) => {
      io.to(receiverId).emit("userStopTyping", { userId });
    });

    // Mark messages as read notification
    socket.on("messagesRead", ({ senderId }) => {
      io.to(senderId).emit("messagesMarkedRead", { readBy: userId });
    });

    socket.on("disconnect", () => {
      const sockets = onlineUsers.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          onlineUsers.delete(userId);
          io.emit("userOffline", { userId });
        }
      }
    });
  });
};

module.exports = { initializeSocket };
