const asyncHandler = require("express-async-handler");
const Course = require("../models/courseModel");
const User = require("../models/userModel");
const cloudinary = require("cloudinary").v2;
const admin = require("firebase-admin");

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
  secure: true,
});

//Firebase setup
const serviceAccount = require("../edu-tech-rhythmic-firebase-adminsdk-fn22u-086ee594f1.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: "gs://edu-tech-rhythmic.appspot.com",
});

// const bucket = admin.storage().bucket();

const createCourse = asyncHandler(async (req, res) => {
  try {
    const { course_title, course_description, course_code } = req.body;

    // Validation
    if (!course_title || !course_description || !course_code) {
      res.status(400);
      throw new Error("Please fill in all fields");
    }

    if (req.file) {
      const file = req.file;

      const storageRef = admin.storage().bucket().file(file.originalname);

      // Upload the file to Firebase Storage
      await storageRef.save(file.buffer, {
        contentType: file.mimetype,
      });

      // Get the public URL of the uploaded file
      var publicUrl = await storageRef.getSignedUrl({
        action: "read",
        // expires: Date.now() + 24 * 3600 * 1000, 
      });
    }

    // Create Post with or without image
    const course = await Course.create({
      course_title,
      course_code,
      course_description: course_description.replace(/\n/g, "<br/>"),
      image: publicUrl.toString(),
    });

    res.status(201).json(course);
  } catch (err) {
    console.error(err);
    const error = new Error(err.message);
    res.status(500).send(error);
  }
});

// Get all Posts
const getCourses = asyncHandler(async (req, res) => {
  try {
    const courses = await Course.find();
    res.status(200).json(courses);
  } catch (error) {
    res.status(404).json({
      message: error.message,
    });
  }
});

// Get single post
const getCourseById = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id)
    .populate({
      path: "lecturers", // Path to the lecturers array in the Course model
      model: "User", // Model that lecturers are referencing
      select: "fullname email image", // Fields to include from the lecturer (user)
    })
    .exec();

  if (!course) {
    res.status(404);
    throw new Error("Course not found");
  }

  res.status(200).json(course); // Return the populated course with lecturer info
});

// Delete Post
const deleteCourse = asyncHandler(async (req, res) => {
  try {
    const deletedCourse = await Course.findByIdAndDelete(req.params.id);

    if (!deletedCourse) {
      return res.status(404).json({ error: "Course not found" });
    }

    return res.status(200).json({ message: "Course deleted successfully" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Add comment to post
const uploadCourseMateriial = asyncHandler(async (req, res) => {
  const { file_name } = req.body;

  if (!file_name) {
    res.status(400);
    throw new Error("Please enter the name of the Material");
  }

  try {
    // Handle Image upload
    let resultFile = {}; // Move this line outside the if block

    if (req.file) {
      const file = req.file;
      // res.send(req.file);
      const storageRef = admin.storage().bucket().file(file.originalname);

      // Upload the file to Firebase Storage
      await storageRef.save(file.buffer, {
        contentType: file.mimetype,
      });

      // Get the public URL of the uploaded file
      const publicUrl = await storageRef.getSignedUrl({
        action: "read",
        expires: Date.now() + 24 * 3600 * 1000, // 24 hour
      });

      const course = await Course.findById(req.params.id);

      if (!course) {
        res.status(404);
        throw new Error("Course not found");
      }

      const course_file = {
        file_name,
        file: publicUrl.toString(),
        user: req.user.id,
      };

      course.course_files.push(course_file);

      await course.save();

      res.status(201).json(course);
    }
  } catch (err) {
    console.error(err);
    res.status(500).send(err);
  }
});

const assignLecturer = asyncHandler(async (req, res) => {
  const { courseId, lecturerId } = req.params;

  try {
    // Find the course by ID
    const course = await Course.findById(courseId);

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    // Check if the lecturer is already assigned
    if (course.lecturers.includes(lecturerId)) {
      return res
        .status(400)
        .json({ message: "Lecturer is already assigned to this course" });
    }

    // Add lecturer to the course
    course.lecturers.push(lecturerId);

    // Save the updated course
    await course.save();

    res.status(200).json({
      message: "Lecturer assigned successfully",
      course,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
});

const registerForCourse = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const studentId = req.user._id.toString(); // Assuming req.user contains authenticated user info
  console.log(studentId, courseId);

  try {
    // Find the course by ID
    const course = await Course.findById(courseId);

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    // Check if the student is already registered
    if (course.students.includes(studentId)) {
      return res
        .status(400)
        .json({ message: "You are already registered for this course" });
    }

    // Add student to course
    course.students.push(studentId);

    // Save the updated course
    await course.save();

    // Add course to student's list of registered courses
    const student = await User.findById(studentId);
    student.courses.push(courseId);
    await student.save();

    res.status(200).json({ message: "Successfully registered for the course" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
});

const getRegisteredCourses = asyncHandler(async (req, res) => {
  const studentId = req.user._id.toString(); // Assuming req.user contains the authenticated user's info

  try {
    // Find the student and populate the courses they are registered for
    const student = await User.findById(studentId).populate({
      path: "courses",
      select: "-students", // Exclude the students field
    });

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    // Respond with the list of courses
    res.status(200).json(student.courses);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
});

const getLecturerCourses = asyncHandler(async (req, res) => {
  const lecturerId = req.user._id; // Assuming req.user contains the authenticated lecturer's info

  try {
    // Find all courses where this lecturer is assigned
    const courses = await Course.find({ lecturers: lecturerId })
      .populate({
        path: "lecturers",
        select: "fullname email", // Customize the fields to return
      })
      .exec();

    if (!courses || courses.length === 0) {
      return res
        .status(404)
        .json({ message: "No courses found for this lecturer" });
    }

    res.status(200).json(courses);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
});

module.exports = {
  createCourse,
  getCourses,
  getCourseById,
  uploadCourseMateriial,
  deleteCourse,
  assignLecturer,
  registerForCourse,
  getRegisteredCourses,
  getLecturerCourses,
};
