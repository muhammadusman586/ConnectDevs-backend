const express = require("express");

const profileRouter = express.Router();
const { userAuth } = require("../middlewares/userAuth.js");
const { validateEditProfileData } = require("../utilis/helper.js");

profileRouter.get("/profile/view", userAuth, async (req, res) => {
  try {
    const user = req.user;
    res.send(user);
  } catch (error) {
    res.status(500).send("Error" + res.error);
  }
});

profileRouter.patch("/profile/edit", userAuth, async (req, res) => {
  try {
    // verify which fields can be edited
    if (!validateEditProfileData(req)) {
      throw new Error("Invalid Edit Request");
    }

    // middleware userAuth return user which is present in db
    const loggedInUser = req.user;
    console.log("Data before updation..............");
    console.log(loggedInUser);
    // looping over the user fields to update data
    Object.keys(req.body).forEach((key) => (loggedInUser[key] = req.body[key]));
    console.log("Data After updation..............");

    console.log(loggedInUser);
    await loggedInUser.save();
    res.json({
      message: `${loggedInUser.firstName}, your profile updated successfully `,
      data: loggedInUser,
    });
  } catch (error) {
    res.status(400).send("Error: " + error);
  }
});

module.exports = {
  profileRouter,
};
