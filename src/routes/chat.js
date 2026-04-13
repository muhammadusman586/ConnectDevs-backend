const express = require("express");
const { userAuth } = require("../middlewares/userAuth");
const { Message } = require("../models/message");
const { ConnectionRequestModel } = require("../models/connectionRequest");
const { createNotification } = require("../utilis/notification");

const chatRouter = express.Router();

// Verify two users are connected before allowing chat
const verifyConnection = async (userId1, userId2) => {
  const connection = await ConnectionRequestModel.findOne({
    $or: [
      { fromUserId: userId1, toUserId: userId2, status: "accepted" },
      { fromUserId: userId2, toUserId: userId1, status: "accepted" },
    ],
  });
  return !!connection;
};

// GET /chat/:userId — get messages with a user (paginated)
chatRouter.get("/chat/:userId", userAuth, async (req, res) => {
  try {
    const loggedInUser = req.user;
    const { userId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;

    const isConnected = await verifyConnection(loggedInUser._id, userId);
    if (!isConnected) {
      return res
        .status(403)
        .json({ message: "You are not connected with this user" });
    }

    const messages = await Message.find({
      $or: [
        { senderId: loggedInUser._id, receiverId: userId },
        { senderId: userId, receiverId: loggedInUser._id },
      ],
    })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    // Mark unread messages from the other user as read
    await Message.updateMany(
      { senderId: userId, receiverId: loggedInUser._id, read: false },
      { $set: { read: true } }
    );

    res.json({ data: messages.reverse() });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// POST /chat/:userId — send a message
chatRouter.post("/chat/:userId", userAuth, async (req, res) => {
  try {
    const loggedInUser = req.user;
    const { userId } = req.params;
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ message: "Message text is required" });
    }

    const isConnected = await verifyConnection(loggedInUser._id, userId);
    if (!isConnected) {
      return res
        .status(403)
        .json({ message: "You are not connected with this user" });
    }

    const message = new Message({
      senderId: loggedInUser._id,
      receiverId: userId,
      text: text.trim(),
    });

    await message.save();

    // Create notification for new message
    await createNotification({
      userId,
      type: "new_message",
      fromUserId: loggedInUser._id,
      message: `${loggedInUser.firstName} sent you a message`,
      metadata: { messageId: message._id },
    });

    res.status(201).json({ data: message });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// GET /chat/unread/count — get total unread message count
chatRouter.get("/chat/unread/count", userAuth, async (req, res) => {
  try {
    const loggedInUser = req.user;
    const count = await Message.countDocuments({
      receiverId: loggedInUser._id,
      read: false,
    });
    res.json({ data: count });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = { chatRouter };
