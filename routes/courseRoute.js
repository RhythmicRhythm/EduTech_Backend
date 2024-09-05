const express = require("express");
const {
  createCourse,
  getCourses,
  uploadCourseMateriial,
  getCourseById,
  deleteCourse,
  assignLecturer,
  registerForCourse,
  getRegisteredCourses,
  getLecturerCourses
} = require("../controllers/courseController");
const protect = require("../middleWare/authMiddleware");
const router = express.Router();
const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post("/newcourse", protect, upload.single("image"), createCourse);
router.get("/allcourses", protect, getCourses);
router.get("/studentcourses", protect, getRegisteredCourses);
router.get("/lecturerscourses", protect, getLecturerCourses);
router.get("/:id", protect, getCourseById);
router.post(
  "/uploadcoursematerial/:id",
  protect,
  upload.single("file"),
  uploadCourseMateriial
);
router.delete("/:id", protect, deleteCourse);
router.post("/assignlecturer/:courseId/:lecturerId", protect, assignLecturer);
router.post("/register/:courseId", protect, registerForCourse);

module.exports = router;
