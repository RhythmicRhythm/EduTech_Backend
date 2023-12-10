const express = require("express");
const {
  createPost,
  getPosts,
  getPostUser,
  addComment,
  getDownload,
  uploadfile,
  deletePost,
  addReply,
  likePost,
  getPostById,
  dislikePost,
} = require("../controllers/postController");
const protect = require("../middleWare/authMiddleware");
const router = express.Router();
// const { upload } = require("../utils/fileUpload");
const multer = require("multer");

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.get("/download", getDownload);
router.post("/upload", upload.single('file'),  uploadfile);
router.post("/", protect, createPost);

router.get("/", protect, getPosts);
router.get("/:id", protect, getPostById);
router.delete("/:id", protect, deletePost);
router.get("/getpostuser", protect, getPostUser);

router.post("/addcomment/:id", protect, addComment);
router.post("/addreply/:id/:commentId", protect, addReply);
router.post("/likepost/:id", protect, likePost);
router.post("/dislikepost/:id", protect, dislikePost);

module.exports = router;
