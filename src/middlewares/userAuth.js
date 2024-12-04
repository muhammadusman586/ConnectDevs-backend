const jwt = require("jsonwebtoken");
const { User } = require("../models/user.js");

const userAuth = async (req, res, next) => {
  try {
    const cookie = req.cookies;
    const { token } = cookie;
    if(!token){
     return  res.status(400).send("Please Login!")
    }
    const decodedObj = await jwt.verify(token, "Hero@586");
    const { _id } = decodedObj;
    const user = await User.findById(_id);
    if(!user){
        throw new Error("User not Found")
    }
    
    req.user=user;
    next();
  } catch (error) {
    res.status(400).send("Error"+error);
  }
};

module.exports = {
  userAuth,
};
