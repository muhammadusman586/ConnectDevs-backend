const { Notification } = require("../models/notification");

// Stored reference to io instance, set from app.js
let ioInstance = null;

const setIO = (io) => {
  ioInstance = io;
};

const getIO = () => ioInstance;

const createNotification = async ({
  userId,
  type,
  fromUserId,
  message,
  metadata,
}) => {
  try {
    const notification = new Notification({
      userId,
      type,
      fromUserId,
      message,
      metadata,
    });
    await notification.save();

    // Populate fromUserId for the real-time push
    const populated = await Notification.findById(notification._id)
      .populate("fromUserId", "firstName lastName photoUrl")
      .lean();

    // Push via Socket.io
    if (ioInstance) {
      ioInstance.to(userId.toString()).emit("newNotification", populated);
    }

    return populated;
  } catch (err) {
    console.error("Failed to create notification:", err.message);
  }
};

module.exports = { setIO, getIO, createNotification };
