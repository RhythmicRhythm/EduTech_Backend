const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const lecturerSchema = mongoose.Schema(
  {
    fullname: {
      type: String,
      required: [true, "Please add a firstname"],
    },
    email: {
      type: String,
      required: [true, "Please add a email"],
      unique: true,
      trim: true,
      match: [
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
        "Please enter a valid emaial",
      ],
    },

    password: {
      type: String,
      required: [true, "Please add a password"],
      minLength: [6, "Password must be up to 6 characters"],
      // maxLength: [23, "Password must not be more than 23 characters"],
    },
    photo: {
      type: String,
      required: [true, "Please add a photo"],
      default:
        "https://img.freepik.com/free-vector/vector-background-seamless-retro-camera-tripod_2065-591.jpg?w=740&t=st=1700038939~exp=1700039539~hmac=2bae01dda7df3a48b21cf621060870cc69e205dae4e4d081a81f27ade6f138bf",
    },
    title: {
      type: String,
    },

    department: {
      type: String,
    },
    dob: {
      type: String,
    },
    resetPasswordCode: {
      type: String,
    },
    resetPasswordCodeExpires: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

//   Encrypt password before saving to DB
lecturerSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(this.password, salt);
  this.password = hashedPassword;
  next();
});

const Lecturer = mongoose.model("Lecturer", lecturerSchema);
module.exports = Lecturer;
