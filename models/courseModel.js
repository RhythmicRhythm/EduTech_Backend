const mongoose = require("mongoose");

const courseSchema = mongoose.Schema(
  {
    course_title: {
      type: String,
      required: true,
    },
    course_description: {
      type: String,
      required: true,
    },
    course_code: {
      type: String,
      required: true,
    },
    image: {
      type: String,
      default:
        "https://img.freepik.com/free-vector/vector-background-seamless-retro-camera-tripod_2065-591.jpg?w=740&t=st=1700038939~exp=1700039539~hmac=2bae01dda7df3a48b21cf621060870cc69e205dae4e4d081a81f27ade6f138bf",
    },
    course_files: [
      {
        file_name: {
          type: String,
          required: true,
        },
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        file: {
          type: String,
          required: true,
        },

        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    students: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    lecturers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User", // Assuming lecturers are users
      },
    ],
  },

  {
    timestamps: true,
  }
);

const Course = mongoose.model("Course", courseSchema);

module.exports = Course;
