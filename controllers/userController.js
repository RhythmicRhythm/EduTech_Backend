const asyncHandler = require("express-async-handler");
const User = require("../models/userModel");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const Token = require("../models/tokenModel");
const sendEmail = require("../utils/sendEmail");
const nodemailer = require("nodemailer");
const errorHandler = require("../middleWare/errorMiddleware");

// Generate Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "1d" });
};

// REGISTER USER
const registerUser = asyncHandler(async (req, res) => {
  const { fullname, email, password } = req.body;

  // Validation
  if (!fullname || !email || !password) {
    res.status(400);
    throw new Error("Please fill in all required fields");
  }
  if (password.length < 6) {
    res.status(400);
    throw new Error("Password must be up to 6 characters");
  }

  // Check if user email already exists
  const userExists = await User.findOne({ email });

  if (userExists) {
    res.status(400);
    throw new Error("Email has already been registered");
  }

  // Create new user
  const user = await User.create({
    fullname,
    email,
    password,
  });

  //   Generate Token
  const token = generateToken(user._id);

  // Send HTTP-only cookie
  res.cookie("token", token, {
    path: "/",
    httpOnly: true,
    expires: new Date(Date.now() + 1000 * 86400), // 1 day
    sameSite: "none",
    secure: true,
  });

  if (user) {
    const { _id, fullname, isAdmin, email, password, photo } = user;
    res.status(200).json({
      _id,
      fullname,
      isAdmin,
      email,
      password,
      photo,
      token,
    });
  } else {
    res.status(400);
    throw new Error("Invalid user data");
  }
});

// Login User
const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Validate Request
  if (!email || !password) {
    res.status(400);
    throw new Error("Please add email and password");
  }

  // Check if user exists
  const user = await User.findOne({ email });

  if (!user) {
    res.status(400);
    throw new Error("User not found, please signup");
  }

  // User exists, check if password is correct
  const passwordIsCorrect = await bcrypt.compare(password, user.password);

  //   Generate Token
  const token = generateToken(user._id);

  // Send HTTP-only cookie
  res.cookie("token", token, {
    path: "/",
    httpOnly: true,
    expires: new Date(Date.now() + 1000 * 86400), // 1 day
    sameSite: "none",
    secure: true,
  });

  if (user && passwordIsCorrect) {
    const { _id, fullname, photo, email, password, isAdmin } = user;
    res.status(200).json({
      _id,
      fullname,
      email,
      password,
      isAdmin,
      photo,
      token,
    });
  } else {
    res.status(400);
    throw new Error("Invalid email or password");
  }
});

// Logout User
const logoutUser = asyncHandler(async (req, res) => {
  res.cookie("token", "", {
    path: "/",
    httpOnly: true,
    expires: new Date(0),
    sameSite: "none",
    secure: true,
  });
  return res.status(200).json({ message: "Successfully Logged Out" });
});

// Get Login Status
const loginStatus = asyncHandler(async (req, res) => {
  const token = req.cookies.token;
  if (!token) {
    return res.json(false);
  }
  // Verify Token
  const verified = jwt.verify(token, process.env.JWT_SECRET);
  if (verified) {
    return res.json(true);
  }
  return res.json(false);
});

// Update User
const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  try {
    const {title, semester, department, dob } = req.body
    const file = req.files.photo;

    console.log(file);


    if (!user) {
      res.status(400);
      throw new Error("error findng user");
    }

    user.title = title;
    user.semester = semester;
    user.department = department;
    user.dob = dob;

    if (file) {
      // Handle image upload  tempFilePath
      const result = await cloudinary.uploader.upload(file.tempFilePath, {
        public_id: `${Date.now()}`,
        transformation: [
          { width: 1080, height: 1080, quality: 80, crop: "fill" },
        ],
      });

      user.photo = result.secure_url;
      console.log(result);
    }


    await user.save();

    console.log("updated");
    res.status(200).json(user);

  } catch (error) {
    res.status(400);
      throw new Error(error);
  }
});

// Get User Data
const getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user) {
    const { _id, fullname, email, photo, isAdmin } = user;
    res.status(200).json({
      _id,
      fullname,
      email,
      photo,
      isAdmin,
    });
  } else {
    res.status(400);
    throw new Error("User Not Found");
  }
});

//Change Password
const changePassword = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  const { oldPassword, password } = req.body;

  if (!user) {
    res.status(400);
    throw new Error("User not found, please signup");
  }
  //Validate
  if (!oldPassword || !password) {
    res.status(400);
    throw new Error("Please add old and new password");
  }

  // check if old password matches password in DB
  const passwordIsCorrect = await bcrypt.compare(oldPassword, user.password);

  // Save new password
  if (user && passwordIsCorrect) {
    user.password = password;
    await user.save();
    res.status(200).send("Password change successful");
  } else {
    res.status(400);
    throw new Error("Old password is incorrect");
  }
});

//Forgot Password
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });

    if (!email) {
      res.status(400);
      throw new Error("Please add email");
    }

    if (!user) {
      res.status(400);
      throw new Error("No Account With that email addresss exist");
    }

    const code = Math.floor(1000 + Math.random() * 9000).toString();
    const fullname = user.fullname;

    // Set the code and  time in the user
    user.resetPasswordCode = code;
    user.resetPasswordCodeExpires = Date.now() + 3600000;

    // Save the updated user
    await user.save();

    // Save email in session for reset password route
    req.session.resetPasswordEmail = email;

    // Send the code to the user's email
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: 587,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: "Password Reset Code",
      html: `<html>
              <head>
                <style>
                 
                  body {
                    font-family: Arial, sans-serif;
                    background-color: #f2f2f2;
                  }
                  .container {
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                    background-color: #ffffff;
                    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
                    border-radius: 5px;
                  }
                  .header {
                    text-align: center;
                    margin-bottom: 20px;
                  }
                  .header h1 {
                    color: #333;
                    font-size: 24px;
                  }
                  .message {
                    margin-bottom: 20px;
                    color: #333;
                    font-size: 18px;
                  }
                  .code {
                    display: block;
                    margin-top: 10px;
                    font-size: 32px;
                    color: #ff5500;
                  }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <h1>QC-Investment || Development Finance </h1>
                  </div>
                  <p class="message">Hello ${fullname}</p>
                  <p class="message">We received a request to reset your password. Please use the following verification code to proceed:</p>
                  <span class="code">${code}</span>
                  <p class="message">If you didn't request a password reset, you can safely ignore this email.</p>
                </div>
              </body>
            </html>`,
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({
      message: "Password Reset Email Sent",
    });
  } catch (error) {
    console.error(error);
    res.status(404);
    throw new Error(error);
  }
});

//Reset Password Sent
const resetemailsent = asyncHandler(async (req, res) => {
  const { code } = req.body;
  const email = req.session.resetPasswordEmail;
  console.log(email);

  const user = await User.findOne({ email });

  if (!code) {
    res.status(404);
    throw new Error("please enter code");
  }

  if (user.resetPasswordCode !== code) {
    res.status(404);
    throw new Error("invalid code");
  }

  if (user.resetPasswordCodeExpires < Date.now()) {
    res.status(404);
    throw new Error("Password reset code expired");
  }

  res.status(200).json({
    message: "Success please proceed",
  });
});

// Reset Password
const resetPassword = asyncHandler(async (req, res) => {
  const { newPassword } = req.body;
  console.log(newPassword);
  const email = req.session.resetPasswordEmail;
  console.log(email);
  try {
    // Validation
    if (!newPassword) {
      res.status(404);
      throw new Error("Please enter a Password");
    }
    if (newPassword.length < 8) {
      res.status(404);
      throw new Error("Password must be at least 8 characters");
    }

    // Find the user by email
    const user = await User.findOne({ email });

    if (!user) {
      res.status(404);
      throw new Error("Account Not Found");
    }

    // Update the user's password
    user.password = newPassword;
    await user.save();

    res.status(200).json({
      message: "Success please proceed",
    });
  } catch (error) {
    console.error("Error resetting password:", error);
    res.status(404);
    throw new Error(error);
  }
});

module.exports = {
  registerUser,
  loginUser,
  logoutUser,
  loginStatus,
  getUser,
  updateUser,
  changePassword,
  forgotPassword,
  resetemailsent,
  resetPassword,
};
