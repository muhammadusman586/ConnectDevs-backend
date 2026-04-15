const express = require("express");
const https = require("https");
const { userAuth } = require("../middlewares/userAuth");
const { User } = require("../models/user");

const githubRouter = express.Router();

// Helper: make HTTPS GET request to GitHub API
const githubApiGet = (path, token) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "api.github.com",
      path,
      method: "GET",
      headers: {
        "User-Agent": "ConnectDevs",
        Accept: "application/vnd.github.v3+json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    };
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          reject(new Error("Failed to parse GitHub response"));
        }
      });
    });
    req.on("error", reject);
    req.end();
  });
};

// Helper: POST to GitHub for token exchange
const githubApiPost = (path, body) => {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(body);
    const options = {
      hostname: "github.com",
      path,
      method: "POST",
      headers: {
        "User-Agent": "ConnectDevs",
        Accept: "application/json",
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(postData),
      },
    };
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          reject(new Error("Failed to parse GitHub response"));
        }
      });
    });
    req.on("error", reject);
    req.write(postData);
    req.end();
  });
};

// GET /github/auth — redirect to GitHub OAuth
githubRouter.get("/github/auth", userAuth, (req, res) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    return res.status(500).json({ message: "GitHub OAuth not configured" });
  }
  const redirectUri =
    process.env.GITHUB_CALLBACK_URL || "http://localhost:3001/github/callback";
  const url = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=read:user,public_repo`;
  res.json({ url });
});

// GET /github/callback — handle OAuth callback
githubRouter.get("/github/callback", userAuth, async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) return res.status(400).json({ message: "No code provided" });

    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;

    // Exchange code for access token
    const tokenData = await githubApiPost("/login/oauth/access_token", {
      client_id: clientId,
      client_secret: clientSecret,
      code,
    });

    if (!tokenData.access_token) {
      return res.status(400).json({ message: "Failed to get access token" });
    }

    // Fetch GitHub user profile
    const profileRes = await githubApiGet("/user", tokenData.access_token);
    const ghUser = profileRes.data;

    // Save to user model
    await User.findByIdAndUpdate(req.user._id, {
      github: {
        username: ghUser.login,
        accessToken: tokenData.access_token,
        profileUrl: ghUser.html_url,
        avatarUrl: ghUser.avatar_url,
        connectedAt: new Date(),
      },
    });

    // Redirect back to frontend profile
    res.redirect("http://localhost:5173/profile");
  } catch (error) {
    console.error("GitHub OAuth error:", error.message);
    res.redirect("http://localhost:5173/profile?github_error=true");
  }
});

// POST /github/connect-username — link by username (no OAuth needed)
githubRouter.post("/github/connect-username", userAuth, async (req, res) => {
  try {
    const { username } = req.body;
    if (!username || !username.trim()) {
      return res.status(400).json({ message: "GitHub username is required" });
    }

    // Verify the username exists on GitHub
    const profileRes = await githubApiGet(`/users/${username.trim()}`);
    if (profileRes.status !== 200) {
      return res.status(404).json({ message: "GitHub user not found" });
    }

    const ghUser = profileRes.data;

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      {
        github: {
          username: ghUser.login,
          profileUrl: ghUser.html_url,
          avatarUrl: ghUser.avatar_url,
          connectedAt: new Date(),
        },
      },
      { new: true }
    ).select("-password");

    res.json({ data: updatedUser });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// GET /github/repos/:userId — get user repos
githubRouter.get("/github/repos/:userId", userAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit) || 6;

    const targetUser = await User.findById(userId).select("github");
    if (!targetUser?.github?.username) {
      return res.status(404).json({ message: "GitHub not connected" });
    }

    const { username, accessToken } = targetUser.github;
    const profileRes = await githubApiGet(
      `/users/${username}/repos?sort=stars&direction=desc&per_page=${limit}&type=owner`,
      accessToken
    );

    if (profileRes.status !== 200) {
      return res.status(502).json({ message: "GitHub API error" });
    }

    const repos = profileRes.data.map((repo) => ({
      name: repo.name,
      description: repo.description,
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      language: repo.language,
      url: repo.html_url,
      updatedAt: repo.updated_at,
    }));

    res.json({ data: repos });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// GET /github/profile/:userId — get GitHub profile summary
githubRouter.get("/github/profile/:userId", userAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const targetUser = await User.findById(userId).select("github");
    if (!targetUser?.github?.username) {
      return res.status(404).json({ message: "GitHub not connected" });
    }

    const { username, accessToken } = targetUser.github;
    const [profileRes, reposRes] = await Promise.all([
      githubApiGet(`/users/${username}`, accessToken),
      githubApiGet(
        `/users/${username}/repos?sort=stars&direction=desc&per_page=100&type=owner`,
        accessToken
      ),
    ]);

    // Aggregate languages
    const langCount = {};
    reposRes.data.forEach((repo) => {
      if (repo.language) {
        langCount[repo.language] = (langCount[repo.language] || 0) + 1;
      }
    });
    const languages = Object.entries(langCount)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));

    res.json({
      data: {
        username: profileRes.data.login,
        name: profileRes.data.name,
        bio: profileRes.data.bio,
        avatarUrl: profileRes.data.avatar_url,
        profileUrl: profileRes.data.html_url,
        publicRepos: profileRes.data.public_repos,
        followers: profileRes.data.followers,
        following: profileRes.data.following,
        languages,
      },
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// DELETE /github/disconnect — remove GitHub from user
githubRouter.delete("/github/disconnect", userAuth, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, {
      $unset: { github: 1 },
    });
    res.json({ message: "GitHub disconnected" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = { githubRouter };
