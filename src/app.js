const express = require("express");
const { connectDB } = require("./config/database");
const app = express();
const PORT = 3001
require('dotenv').config();

const cookieParser = require("cookie-parser");
const cors = require("cors");

app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json());
app.use(cookieParser());

const { authRouter } = require("./routes/auth.js");
const { profileRouter } = require("./routes/profile.js");
const { requestRouter } = require("./routes/request.js");
const { userRouter } = require("./routes/user.js");

app.use("/", authRouter);
app.use("/", profileRouter);
app.use("/", requestRouter);
app.use("/", userRouter);

connectDB()
  .then(() => {
    console.log("Database Connected...........");

    app.listen(PORT, () => {
      console.log(`Server is listening at PORT:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Database Connection Failed......");
  });

// const express = require("express");
// const { connectDB } = require("./config/database");
// const { User } = require("./models/user");
// // const jwt = require("jsonwebtoken");
// const cookieParser = require("cookie-parser");
// const PORT = 3000;
// const {authRouter}=require('./routes/auth.js');
// const {profileRouter}=require('./routes/profile.js');
// const {requestRouter}=require('./routes/request.js')

// const { validateSignup } = require("./utilis/helper.js");
// const bycrypt = require("bcrypt");
// const { userAuth } = require("./middlewares/userAuth.js");
// const validator = require("validator");
// const app = express();

// app.use(express.json());
// app.use(cookieParser());

// app.use('/',authRouter);
// app.use('/',profileRouter);
// app.use('/',requestRouter);

// const SECRET_KEY = "Hero@586";

// app.patch("/user/:userId", async (req, res) => {
//   const userId = req.params?.userId;
//   const data = req.body;

//   try {
//     const ALLOWED_UPDATES = ["photoUrl", "about", "gender", "age", "skills"];
//     const isUpdateAllowed = Object.keys(data).every((k) =>
//       ALLOWED_UPDATES.includes(k)
//     );

//     if (!isUpdateAllowed) {
//       return res.status(400).send("Update not allowed");
//     }

//     if (data?.skills?.length > 10) {
//       return res.status(400).send("Skills cannot be more than 10");
//     }

//     const user = await User.findByIdAndUpdate(userId, data, {
//       runValidators: true,
//       new: true,
//     });
//     if (!user) {
//       return res.status(404).send("User not found");
//     }

//     console.log(user);
//     res.send("Data Updated");
//   } catch (error) {
//     res.status(500).send("Error: " + error.message);
//   }
// });

// app.delete("/user", async (req, res) => {
//   const userId = req.body.userId;
//   console.log(userId);
//   try {
//     const resData = await User.findByIdAndDelete({ _id: userId });
//     res.send("User Deleted");
//   } catch (error) {
//     res.status(500).send("Error" + res.error);
//   }
// });

// app.get("/feed", async (req, res) => {
//   const cookie = req.cookies;
//   console.log(cookie);
//   try {
//     const resData = await User.find({});

//     if (resData === 0) {
//       res.send("Users Not Founds");
//     } else {
//       res.send(resData);
//     }
//   } catch (err) {
//     res.status(500).send("Error" + res.err);
//   }
// });

// app.get("/user", async (req, res) => {
//   try {
//     const cookie = req.cookies;
//     console.log(cookie);
//     const { token } = cookie;
//     const decodedId = jwt.verify(token, SECRET_KEY);

//     const resData = await User.findOne({ _id: decodedId });
//     console.log(resData);

//     if (resData === 0) {
//       res.send("Users Not Founds");
//     } else {
//       res.send(resData);
//     }
//   } catch (err) {
//     res.status(500).send("Error" + res.err);
//   }
// });

// app.post("/sendConnectionRequest", userAuth, (req, res) => {
//   try {
//     const user = req.user;
//     res.send(user.firstName + "Send the Connection Request");
//   } catch (error) {
//     res.status(500).send("Error" + error);
//   }
// });

// app.get("/profile", userAuth, async (req, res) => {
//   try {
//     const user = req.user;
//     res.send(user);
//   } catch (error) {
//     res.status(500).send("Error" + res.error);
//   }
// });

// app.post("/login", async (req, res) => {
//   try {
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
//       res.cookie("token", token, { expires: new Date(Date.now() + 900000) });
//       res.send("User Login successfully!!!");
//     } else {
//       throw new Error("Invalid Credentials");
//     }
//   } catch (err) {
//     res.status(500).send("Error: " + err.message);
//   }
// });

// app.post("/signup", async (req, res) => {
//   // const user = new User({
//   //   firstName: "M.Usman",
//   //   lastName: "Ramzan",
//   //   email: "usman123@gmail.com",
//   //   password: "23423424",
//   //   age: 21,
//   //   gender: "Male",
//   // });

//   // console.log(req.body);

//   try {
//     /// validate the data
//     validateSignup(req);
//     ///encrypt the password

//     const { firstName, lastName, email, password } = req.body;

//     const encryptPassword = await bycrypt.hash(password, 10);
//     console.log(encryptPassword);
//     // store the data in the db Now

//     const user = new User({
//       firstName,
//       lastName,
//       email,
//       password: encryptPassword,
//     });

//     // const user = new User(req.body);

//     await user.save();
//     res.send("User is created Successfully");
//   } catch (err) {
//     res.status(400).send("Error Saving the User" + err.message);
//   }
// });

// connectDB()
//   .then(() => {
//     console.log("Database Connected...........");

//     app.listen(PORT, () => {
//       console.log(`Server is listening at PORT:${PORT}`);
//     });
//   })
//   .catch((err) => {
//     console.error("Database Connection Failed......");
//   });

// const {userAuth}=require("./middlewares/auth")

// app.use("/user",userAuth);

// app.get("/user/getData",(err,req,res,next)=>{
//     if(err){
//         res.status(500).send("Something Went Wrong !");
//     }

//     console.log("Getting user data");
//     res.send("UserData");
// })
// app.use("/user",(req,res,next)=>{

//     console.log("Handling the route handler 1");
//     next();
//     // res.send("Router handler 1")

// },
// (req,res,next)=>{
//     console.log("Handling the route handler 2");
//     next();
//     res.send("Handler 2")

// }
// )

// app.get('/user',(req,res)=>{
//     // console.log("HEllo G");
//     res.send({firstName:"M.Usman",lastName:"Ramzan"});
// });

// app.post('/user',(req,res)=>{
//     res.send("Data saved to database Successfully")
// })

// app.delete(('/user'),(req,res)=>{
//     res.send("Data delelted Successfully")
// })

// app.use('/',(req,res)=>{
//     res.send("HEllo");
// })

// const {userAuth}=require("./middlewares/auth")

// app.use("/user",userAuth);

// app.get("/user/getData",(err,req,res,next)=>{
//     if(err){
//         res.status(500).send("Something Went Wrong !");
//     }

//     console.log("Getting user data");
//     res.send("UserData");
// })
// app.use("/user",(req,res,next)=>{

//     console.log("Handling the route handler 1");
//     next();
//     // res.send("Router handler 1")

// },
// (req,res,next)=>{
//     console.log("Handling the route handler 2");
//     next();
//     res.send("Handler 2")

// }
// )

// app.get('/user',(req,res)=>{
//     // console.log("HEllo G");
//     res.send({firstName:"M.Usman",lastName:"Ramzan"});
// });

// app.post('/user',(req,res)=>{
//     res.send("Data saved to database Successfully")
// })

// app.delete(('/user'),(req,res)=>{
//     res.send("Data delelted Successfully")
// })

// app.use('/',(req,res)=>{
//     res.send("HEllo");
// })
