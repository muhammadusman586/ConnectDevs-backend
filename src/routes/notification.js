const express = require("express");
const { userAuth } = require("../middlewares/userAuth");
const { Notification } = require("../models/notification");

const notificationRouter = express.Router();

// GET /notifications — paginated list + unread count
notificationRouter.get("/notifications", userAuth, async (req, res) => {
  try {
    const loggedInUser = req.user;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const [notifications, unread] = await Promise.all([
      Notification.find({ userId: loggedInUser._id })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("fromUserId", "firstName lastName photoUrl")
        .lean(),
      Notification.countDocuments({ userId: loggedInUser._id, read: false }),
    ]);

    res.json({ data: notifications, unread });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// PATCH /notifications/read — mark specific notifications as read
notificationRouter.patch("/notifications/read", userAuth, async (req, res) => {
  try {
    const { ids } = req.body;
    await Notification.updateMany(
      { _id: { $in: ids }, userId: req.user._id },
      { $set: { read: true } }
    );
    res.json({ message: "Marked as read" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// PATCH /notifications/read-all — mark all as read
notificationRouter.patch(
  "/notifications/read-all",
  userAuth,
  async (req, res) => {
    try {
      await Notification.updateMany(
        { userId: req.user._id, read: false },
        { $set: { read: true } }
      );
      res.json({ message: "All marked as read" });
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
);

// DELETE /notifications/:id
notificationRouter.delete(
  "/notifications/:id",
  userAuth,
  async (req, res) => {
    try {
      await Notification.findOneAndDelete({
        _id: req.params.id,
        userId: req.user._id,
      });
      res.json({ message: "Notification deleted" });
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
);

module.exports = { notificationRouter };
