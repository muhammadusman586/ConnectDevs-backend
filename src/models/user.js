const mongoose = require("mongoose");
const validator = require("validator");
const jwt = require("jsonwebtoken");
const bycrypt = require("bcrypt");
const userSchema = mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      minLength: 3,
      maxLength: 50,
    },
    lastName: {
      type: String,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      unique: true,
      validate(value) {
        if (!validator.isEmail(value)) {
          throw new Error("Enter valid email" + value);
        }
      },
    },
    password: {
      type: String,
      required: true,
      validate(value) {
        if (!validator.isStrongPassword(value)) {
          throw new Error("Create a strong password" + value);
        }
      },
    },

    age: {
      type: Number,
      min: 7,
    },
    gender: {
      type: String,
      enum: {
        values: ["male","female","other"],
        message: `{VALUE} is not a valid gender value`
      },
      validate(value) {
        if (!["male", "female", "other"].includes(value)) {
          throw new Error("Gender Data is not Valid");
        }
      },
    },
    about: {
      type: String,
      default: "This is the default about the user",
    },
    skills: {
      type: [String],
    },
    photoUrl: {
      type: String,
      default:
        "https://canningsolicitors.ie/wp-content/uploads/2021/12/00-user-dummy-200x200-1.png",
    },
  },
  { timestamps: true }
);

userSchema.index({firstName:1,lastName:1})

userSchema.methods.getJwt = function () { 
  const user = this;
  const token = jwt.sign({ _id: user._id }, "Hero@586", { expiresIn: "1day" });
  // console.log("Generated Token: ", token);
  return token;
};

userSchema.methods.validatePassword = async function (userEnteredPassword) {
  const user = this;
  const passwordHash = user.password;

  const isPasswordValid = await bycrypt.compare(
    userEnteredPassword,
    passwordHash
  );
  return isPasswordValid;
};

const User = mongoose.model("User", userSchema);

module.exports = {
  User,
};
