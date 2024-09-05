const express = require("express");
const {
  registerUser,
  loginUser,
  logoutUser,
  loginStatus,
  getUser,
  getLecturers,
  getAllUsers,
  updateUser,
  changePassword,

  forgotPassword,
  resetemailsent,
  resetPassword,
} = require("../controllers/userController");
const router = express.Router();
const protect = require("../middleWare/authMiddleware");
const multer = require("multer");

// Use memory storage for Firebase
const storage = multer.diskStorage({
  destination: "tmp/", // Temporary directory for storing uploaded files
  filename: (req, file, cb) => {
    cb(null, new Date().toISOString() + "-" + file.originalname); // Generate unique filename
  },
});
const upload = multer({ storage });

router.post("/register", registerUser);

router.post("/login", loginUser);

router.get("/logout", logoutUser);
router.get("/loggedin", loginStatus);
router.get("/getuser", protect, getUser);
router.get("/getlecturer", protect, getLecturers);
router.get("/getallusers", protect, getAllUsers);

router.patch("/changepassword", protect, changePassword);
router.put("/updateuser", protect, upload.single("photo"), updateUser);
router.post("/forgotpassword", forgotPassword);
router.post("/resetemailsent/:email", resetemailsent);
router.put("/resetpassword/:email", resetPassword);

module.exports = router;
