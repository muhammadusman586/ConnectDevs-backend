const express = require("express");
const { User } = require("../models/user");
const { ConnectionRequestModel } = require("../models/connectionRequest");

const publicRouter = express.Router();

const PUBLIC_FIELDS = "firstName lastName photoUrl age gender about skills github";

// GET /feed/public — browse developers without auth
publicRouter.get("/feed/public", async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);

    const users = await User.aggregate([
      { $sample: { size: limit } },
      {
        $project: {
          firstName: 1,
          lastName: 1,
          photoUrl: 1,
          age: 1,
          gender: 1,
          about: 1,
          skills: 1,
          github: { username: 1, profileUrl: 1, avatarUrl: 1 },
        },
      },
    ]);

    res.json({ data: users });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /explore — browse developers by skill
publicRouter.get("/explore", async (req, res) => {
  try {
    const { skill } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const skip = (page - 1) * limit;

    if (skill) {
      // Return developers with this skill
      const users = await User.find({ skills: skill })
        .select(PUBLIC_FIELDS)
        .skip(skip)
        .limit(limit)
        .lean();

      const total = await User.countDocuments({ skills: skill });

      return res.json({ data: users, total, page, limit });
    }

    // No skill specified — return skill categories with counts
    const categories = await User.aggregate([
      { $unwind: "$skills" },
      { $group: { _id: "$skills", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 50 },
      { $project: { skill: "$_id", count: 1, _id: 0 } },
    ]);

    res.json({ data: categories });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /leaderboard — top developers by connection count
publicRouter.get("/leaderboard", async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const { skill } = req.query;

    // Aggregate accepted connections per user
    const pipeline = [
      { $match: { status: "accepted" } },
      {
        $project: {
          users: ["$fromUserId", "$toUserId"],
        },
      },
      { $unwind: "$users" },
      {
        $group: {
          _id: "$users",
          connections: { $sum: 1 },
        },
      },
      { $sort: { connections: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $project: {
          _id: "$user._id",
          firstName: "$user.firstName",
          lastName: "$user.lastName",
          photoUrl: "$user.photoUrl",
          skills: "$user.skills",
          about: "$user.about",
          github: {
            username: "$user.github.username",
            profileUrl: "$user.github.profileUrl",
          },
          connections: 1,
        },
      },
    ];

    let results = await ConnectionRequestModel.aggregate(pipeline);

    // If skill filter, filter after aggregation
    if (skill) {
      results = results.filter(
        (r) => r.skills && r.skills.includes(skill)
      );
    }

    // If no connections exist yet, fall back to all users
    if (results.length === 0) {
      const users = await User.find(skill ? { skills: skill } : {})
        .select(PUBLIC_FIELDS)
        .limit(limit)
        .lean();

      results = users.map((u, i) => ({
        ...u,
        connections: 0,
      }));
    }

    res.json({ data: results });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /user/profile/:userId — public profile for any developer
publicRouter.get("/user/profile/:userId", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .select(PUBLIC_FIELDS)
      .lean();

    if (!user) {
      return res.status(404).json({ message: "Developer not found" });
    }

    // Count their connections
    const connectionCount = await ConnectionRequestModel.countDocuments({
      $or: [
        { fromUserId: user._id, status: "accepted" },
        { toUserId: user._id, status: "accepted" },
      ],
    });

    res.json({ data: { ...user, connectionCount } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = { publicRouter };
