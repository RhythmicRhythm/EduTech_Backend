const express = require("express");
const {
  createPost,
  getPosts,
  getPostUser,
  addComment,
  getDownload,

  deletePost,
  addReply,
  likePost,
  getPostById,
  dislikePost,
} = require("../controllers/postController");
const protect = require("../middleWare/authMiddleware");
const router = express.Router();
// const { upload } = require("../utils/fileUpload");
const cloudinary = require("cloudinary").v2;
const multer = require("multer");
const admin = require("firebase-admin");
const path = require("path");

const storage = multer.memoryStorage();
// Use memory storage for Firebase
// const storage = multer.diskStorage({
//   destination: 'tmp/', // Temporary directory for storing uploaded files
//   filename: (req, file, cb) => {
//     cb(null, new Date().toISOString() + '-' + file.originalname); // Generate unique filename
//   },
// });
const upload = multer({ storage });

//Firebase setup
// const serviceAccount = require("../edu-tech-rhythmic-firebase-adminsdk-fn22u-086ee594f1.json");
// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount),
//   storageBucket: "gs://edu-tech-rhythmic.appspot.com",
// });

// const bucket = admin.storage().bucket();

router.post("/upload", upload.single("file"), async (req, res) => {
  const { title } = req.body;

  if (!title) {
    return res
      .status(400)
      .json({ error: "Title, Description & content are required" });
  }

  let fileData = {};

  // if (req.file) {
  //   const file = req.file;
  //   // res.send(req.file);
  //   const storageRef = admin.storage().bucket().file(file.originalname);

  //    // Upload the file to Firebase Storage
  //    await storageRef.save(file.buffer, {
  //     contentType: file.mimetype,
  //   });

  //    // Get the public URL of the uploaded file
  //    const publicUrl = await storageRef.getSignedUrl({
  //     action: 'read',
  //     expires: Date.now() + 3600 * 1000, // 1 hour
  //   });

  //   res.send({ message: 'File uploaded successfully!', url: publicUrl });
  //   console.log(publicUrl);

  // }
  if (req.file) {
    res.send(req.file);
  }
  console.log("title");
});

router.get("/download", getDownload);
// router.post("/upload", upload.single('file'),  uploadfi);
router.post("/", protect, upload.single("image"), createPost);

router.get("/", protect, getPosts);
router.get("/:id", protect, getPostById);
router.delete("/:id", protect, deletePost);
router.get("/getpostuser", protect, getPostUser);

router.post("/addcomment/:id", protect, upload.single("file"), addComment);
router.post("/addreply/:id/:commentId", protect, addReply);
router.post("/likepost/:id", protect, likePost);
router.post("/dislikepost/:id", protect, dislikePost);

module.exports = router;
