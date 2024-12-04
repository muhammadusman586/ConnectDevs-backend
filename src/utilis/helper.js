const validator = require("validator");
const validateSignup = (req) => {
  const { firstName, lastName, email, password } = req.body;

  if (!firstName || !lastName) {
    throw new Error("Name Required");
  }

  if (!validator.isEmail(email)) {
    throw new Error("Email is not valid");
  }

  if (!validator.isStrongPassword(password)) {
    throw new Error("Make Password Strong");
  }
};

const validateEditProfileData = (req) => {
  const allowedEditFields = [
    "firstName",
    "lastName",
    "email",
    "photoUrl",
    "gender",
    "about",
    "age",
    "skills",
  ];
  const isAllowedEdit = Object.keys(req.body).every((field) =>
    allowedEditFields.includes(field)
  );
  console.log(isAllowedEdit);
  return isAllowedEdit;
};

module.exports = {
  validateSignup,
  validateEditProfileData,
};
