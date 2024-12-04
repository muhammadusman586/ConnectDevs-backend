const express = require("express");

const authRouter = express.Router();
const validator = require("validator");
const { validateSignup } = require("../utilis/helper.js");
const { User } = require("../models/user");
const jwt = require("jsonwebtoken");
const bycrypt = require("bcrypt");

// authRouter.post("/login", async (req, res) => {
//   try {
//     console.log(req.body);
//     const { email: userEmail, password: userEnteredPassword } = req.body;
//     // const token=jwt.sign(data,SECRET_KEY,{expiresIn:'1H'});

//     // validating the email by validator npm package
//     if (!validator.isEmail(userEmail)) {
//       throw new Error("write email in correct form ");
//     }
//     // finding the email in db if exist
//     const userData = await User.findOne({ email: userEmail });
//     // const resData = await User.find({ email: userEmail });
//     if (!userData) {
//       throw new Error("User not found");
//     }

//     // const flag = await bycrypt.compare(userPassword, userData.password);
//     const isPasswordValid = await userData.validatePassword(
//       userEnteredPassword
//     );
//     if (isPasswordValid === true) {
//       // creating token

//       const token = await userData.getJwt();

//       // const token = jwt.sign({ _id: userData._id }, SECRET_KEY,{expiresIn:'1day'});

//       // send cookie to client
//     //   res.cookie("token", token, { expires: new Date(Date.now() + 900000) });
//       res.cookie("token", token, { expires: new Date(Date.now() + 900000) });
//       res.send("User Login successfully!!!");
//     } else {
//       throw new Error("Invalid Credentials");
//     }
//   } catch (err) {
//     res.status(500).send("Error: " + err.message);
//   }
// });

authRouter.post("/login", async (req, res) => {
  try {
    // console.log("Request body:", req.body); // Log request body
    const { email: userEmail, password: userEnteredPassword } = req.body;

    if (!validator.isEmail(userEmail)) {
      throw new Error("Invalid email format");
    }

    const userData = await User.findOne({ email: userEmail });
    if (!userData) {
      throw new Error("User not found");
    }

    const isPasswordValid = await userData.validatePassword(
      userEnteredPassword
    );
    if (isPasswordValid) {
      const token = await userData.getJwt();
      res.cookie("token", token, { expires: new Date(Date.now() + 900000) });
      res.send(userData);
    } else {
      throw new Error("Invalid credentials");
    }
  } catch (err) {
    console.error("Error:", err.message); // Log the error
    res.status(500).send("Error: " + err.message);
  }
});

authRouter.post("/signup", async (req, res) => {
  // const user = new User({
  //   firstName: "M.Usman",
  //   lastName: "Ramzan",
  //   email: "usman123@gmail.com",
  //   password: "23423424",
  //   age: 21,
  //   gender: "Male",
  // });

  // console.log(req.body);

  try {
    /// validate the data
    validateSignup(req);
    ///encrypt the password

    const { firstName, lastName, email, password } = req.body;

    const encryptPassword = await bycrypt.hash(password, 10);
    // console.log(encryptPassword);
    // store the data in the db Now

    const user = new User({
      firstName,
      lastName,
      email,
      password: encryptPassword,
    });

    // const user = new User(req.body);

    const savedUser = await user.save();
    // console.log("data saved");
    const token = await savedUser.getJwt();
    res.cookie("token", token, {
      expires: new Date(Date.now() + 8 * 3600000),
    });
    res.json({ message: "User Added successfully!", data: savedUser });

    // res.send("User is created Successfully");
  } catch (err) {
    res.status(400).send("Error Saving the User" + err.message);
  }
});

authRouter.post("/logout", (req, res) => {
  res.cookie("token", null, {
    expires: new Date(Date.now()),
  });
  res.send("Logout successfully............");
});

module.exports = {
  authRouter,
};
