const express = require("express");
const { userAuth } = require("../middlewares/userAuth");
const { ConnectionRequestModel } = require("../models/connectionRequest");
const { User } = require("../models/user");

const userRouter = express.Router();
const selection="toUserId firstName lastName photoUrl age gender about skills github";

userRouter.get("/user/requests/received", userAuth, async (req, res) => {
  try {
    const loggedInUser = req.user;
    const connectionRequests = await ConnectionRequestModel.find({
      toUserId: loggedInUser._id,
      status: "interested",
    }).populate("fromUserId", [
      "firstName",
      "lastName",
      "photoUrl",
      "age",
      "gender",
      "about",
      "skills",
      "github",
    ]);
    res.json({
      message: "Data fetched successfully",
      data: connectionRequests,
    });
  } catch (error) {
    res.status(400).send("Error" + error.message);
  }
});

userRouter.get("/user/connections", userAuth, async (req, res) => {
  try {
    const loggedInUser = req.user;

    const connectionRequests = await ConnectionRequestModel.find({
      $or: [
        { toUserId: loggedInUser, status: "accepted" },
        { fromUserId: loggedInUser, status: "accepted" },
      ],
    })
      .populate(
        "fromUserId",
        "firstName lastName photoUrl age gender about skills github"
      )
      .populate(
        "toUserId",
        "firstName lastName photoUrl age gender about skills github"
      );

    // console.log(connectionRequests);

    const data = connectionRequests.map((row) => {
      if (row.fromUserId._id.toString() === loggedInUser._id.toString()) {
        return row.toUserId;
      }
      return row.fromUserId;
    });
    res.json({ data });
  } catch (error) {
    res.status(400).send("Error" + error.message);
  }
});

userRouter.get("/feed", userAuth, async (req, res) => {
  try {
    const loggedInUser = req.user;
    const page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 10;
    limit = limit > 50 ? 50 : limit;
    const skip = (page - 1) * limit;

    const { skills, minAge, maxAge, gender, search } = req.query;

    const connectionRequests = await ConnectionRequestModel.find({
      $or: [{ fromUserId: loggedInUser }, { toUserId: loggedInUser }],
    });

    const hideUsersFromFeed = new Set();
    connectionRequests.forEach((req) => {
      hideUsersFromFeed.add(req.fromUserId.toString());
      hideUsersFromFeed.add(req.toUserId.toString());
    });

    const filter = {
      _id: { $nin: Array.from(hideUsersFromFeed) },
    };
    filter._id.$ne = loggedInUser._id;

    if (skills) {
      filter.skills = { $in: skills.split(",").map((s) => s.trim()) };
    }
    if (minAge || maxAge) {
      filter.age = {};
      if (minAge) filter.age.$gte = parseInt(minAge);
      if (maxAge) filter.age.$lte = parseInt(maxAge);
    }
    if (gender) {
      filter.gender = gender;
    }
    if (search) {
      const regex = new RegExp(search, "i");
      filter.$or = [{ firstName: regex }, { lastName: regex }];
    }

    const users = await User.find(filter)
      .select(selection)
      .skip(skip)
      .limit(limit);

    res.json({ data: users });
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
});

module.exports = {
  userRouter,
};
