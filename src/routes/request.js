const express = require("express");
const requestRouter = express.Router();
const { userAuth } = require("../middlewares/userAuth.js");
const { ConnectionRequestModel } = require("../models/connectionRequest.js");
const { User } = require("../models/user.js");
const { createNotification } = require("../utilis/notification.js");

requestRouter.post(
  "/request/send/:status/:touserId",
  userAuth,
  async (req, res) => {
    try {
      const fromUserId = req.user._id;
      const toUserId = req.params.touserId;
      const status = req.params.status;

      const allowedStatus = ["ignore", "interested"];
      if (!allowedStatus.includes(status)) {
        return res
          .status(400)
          .json({ message: "Invalid status Type" + status });
      }

      const toUser = await User.findById(toUserId);
      // console.log(toUser);
      if (!toUser) {
        return res.status(400).send("User not Found");
      }

      /// IF there is existing connection Request
      const existingConnectionRequest = await ConnectionRequestModel.findOne({
        $or: [
          { fromUserId, toUserId },
          { fromUserId: toUserId, toUserId: fromUserId },
        ],
      });

      if (existingConnectionRequest) {
        return res.status(400).send({
          message: "Connection request already exist",
        });
      }

      const connectionRequest = new ConnectionRequestModel({
        fromUserId,
        toUserId,
        status,
      });

      const data = await connectionRequest.save();

      // Create notification for "interested" requests
      if (status === "interested") {
        await createNotification({
          userId: toUserId,
          type: "request_received",
          fromUserId,
          message: `${req.user.firstName} wants to connect with you`,
          metadata: { requestId: data._id },
        });
      }

      res.json({
        message:
          req.user.firstName + " is " + status + " in " + toUser.firstName,
        data,
      });
    } catch (error) {
      res.status(500).send("Error" + error);
    }
  }
);

requestRouter.post(
  "/request/review/:status/:requestId",
  userAuth,
  async (req, res) => {
    const loggedInUser = req.user;
    const { status, requestId } = req.params;
    const allowedStatus = ["accepted", "rejected"];
    if (!allowedStatus.includes(status)) {
      return res.status(400).json({ message: "Status not allowed!" });
    }

    const connectionRequest = await ConnectionRequestModel.findOne({
      _id: requestId,
      toUserId: loggedInUser._id,
      status: "interested",
    });
    if (!connectionRequest) {
      return res.status(404).json({ message: "Connection request not found" });
    }
    connectionRequest.status = status;
    const data = await connectionRequest.save();

    // Create notification when request is accepted
    if (status === "accepted") {
      await createNotification({
        userId: connectionRequest.fromUserId,
        type: "request_accepted",
        fromUserId: loggedInUser._id,
        message: `${loggedInUser.firstName} accepted your connection request`,
        metadata: { requestId: data._id },
      });
    }

    res.json({
      message: "Connection Request" + status,
      data,
    });
  }
);

module.exports = {
  requestRouter,
};
