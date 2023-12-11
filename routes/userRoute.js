const express = require("express");
const {
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
} = require("../controllers/userController");
const router = express.Router();
const protect = require("../middleWare/authMiddleware");

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/logout", logoutUser);
router.get("/loggedin", loginStatus);
router.get("/getuser", protect, getUser);

router.patch("/changepassword", protect, changePassword);
router.put("/updateuser", protect, updateUser);
router.post("/forgotpassword", forgotPassword);
router.post("/resetemailsent/:email", resetemailsent);
router.put("/resetpassword", resetPassword);

module.exports = router;
