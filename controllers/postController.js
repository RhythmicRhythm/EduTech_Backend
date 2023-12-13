const asyncHandler = require("express-async-handler");
const { fileSizeFormatter } = require("../utils/fileUpload");
const Post = require("../models/postModel");
const cloudinary = require("cloudinary").v2;
const User = require("../models/userModel");
const axios = require("axios");
const fs = require("fs");
const multer = require("multer");
const admin = require("firebase-admin");
const { uuid } = require("uuidv4");
const path = require("path");

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
  secure: true,
});

// const storage = multer.memoryStorage();
// const upload = multer({ storage: storage });

//Firebase setup
const serviceAccount = require("../edu-tech-rhythmic-firebase-adminsdk-fn22u-086ee594f1.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: "gs://edu-tech-rhythmic.appspot.com",
});

// const bucket = admin.storage().bucket();

const createPost = asyncHandler(async (req, res) => {
  try {
    const { course_title, course_description, course_code } = req.body;
    

    // Validation
    if (!course_title || !course_description || !course_code) {
      res.status(400);
      throw new Error("Please fill in all fields");
    }

    // Handle Image upload
    // let publicUrl = {}; // Move this line outside the if block

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
        expires: Date.now() + 24 * 3600 * 1000, // 24 hour
      });

    
    }

    // Fetch user from the database
    const user = await User.findById(req.user.id);

    // Create Post with or without image
    const post = await Post.create({
      author: req.user.id,
      name: user.fullname,
      course_title,
      course_code,
      course_description: course_description.replace(/\n/g, "<br/>"),
      image: publicUrl.toString(),
    });

    res.status(201).json(post);
  } catch (err) {
    console.error(err);
    const error = new Error(err.message);
    res.status(500).send(error);
  }
});

// Get all Posts
const getPosts = asyncHandler(async (req, res) => {
  try {
    const posts = await Post.find();
    res.status(200).json(posts);
  } catch (error) {
    res.status(404).json({
      message: error.message,
    });
  }
});

// Get posts under an admin
const getPostUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);

  // Log the ID of the user who added the current user
  const posts = await Post.find({ author: user.addedBy }).sort("-createdAt");

  res.status(200).json(posts);
});

// Get single post
const getPostById = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.id)
    .populate({
      path: "author comments.user comments.replies.user",
      model: "User",
      select: "firstname lastname image",
      strictPopulate: false, // add this line to fix the error
    })
    .exec();

  if (!post) {
    res.status(404);
    throw new Error("Post not found");
  }

  res.status(200).json(post);
});

// Delete Post
const deletePost = asyncHandler(async (req, res) => {
  try {
    const deletedPost = await Post.findByIdAndDelete(req.params.id);

    if (!deletedPost) {
      return res.status(404).json({ error: "Post not found" });
    }

    return res.status(200).json({ message: "Post deleted successfully" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Add comment to post
const addComment = asyncHandler(async (req, res) => {
  const { file_name } = req.body;

  if (!file_name) {
    res.status(400);
    throw new Error("Please enter a comment");
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

      const post = await Post.findById(req.params.id);

      if (!post) {
        res.status(404);
        throw new Error("Post not found");
      }

      const course_file = {
        file_name,
        file: publicUrl.toString(),
        user: req.user.id,
      };

      post.course_files.push(course_file);

      await post.save();

      res.status(201).json(post);
    }
  } catch (err) {
    console.error(err);
    res.status(500).send(err);
  }
});

const uploadfile = asyncHandler(async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send("No file uploaded.");
    }

    const file = req.file;

    // Create a unique filename to avoid overwriting existing files
    const uniqueFileName = Date.now() + path.extname(file.originalname);

    // Upload the file to Firebase Storage
    const fileUpload = bucket.file(uniqueFileName);
    const stream = fileUpload.createWriteStream({
      metadata: {
        contentType: file.mimetype,
      },
    });

    stream.on("error", (err) => {
      console.error(err);
      return res.status(500).send(err.message);
    });

    stream.on("finish", () => {
      const fileUrl = `https://storage.googleapis.com/${bucketName}/${fileUpload.name}`;

      // Here, you can save the Firebase Storage URL or any relevant information in your database

      res.send(`File uploaded to Firebase Storage: ${fileUrl}`);
    });

    // Use pipe to handle the file stream correctly
    file.stream.pipe(stream);
  } catch (error) {
    console.error(error);
    return res.status(500).send(error.message);
  }
});

const getDownload = asyncHandler(async (req, res) => {
  const { publicId } = "1701542190195_image";

  // Use the `cloudinary.url` method to generate a URL for the original file
  const originalUrl = cloudinary.url(publicId, {
    resource_type: "raw", // 'raw' ensures you get the original file
  });

  // Set the destination path where you want to save the downloaded file
  const destinationPath = `/`;

  // Use Axios to download the file
  axios({
    method: "get",
    url: "https://res.cloudinary.com/dyvog4dzo/image/upload/v1701542193/1701542190195_image.pdf",
    responseType: "stream",
  })
    .then((response) => {
      // Pipe the response stream to a file
      response.data.pipe(fs.createWriteStream(destinationPath));

      // Send a success response
      res.status(200).send(`File downloaded to: ${destinationPath}`);
    })
    .catch((error) => {
      console.error("Error downloading file:", error);

      // Send an error response
      res.status(500).send("Error downloading file");
    });
});

// Add reply to comment
const addReply = asyncHandler(async (req, res) => {
  const { replyText } = req.body;

  if (!replyText) {
    res.status(400);
    throw new Error("Please enter a reply");
  }

  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      res.status(404);
      throw new Error("Post not found");
    }

    const comment = post.comments.id(req.params.commentId);

    if (!comment) {
      res.status(404);
      throw new Error("Comment not found");
    }

    const commentreply = {
      replyText,
      user: req.user.id,
    };

    comment.replies.push(commentreply);

    await post.save();

    res.status(201).json(post);
  } catch (err) {
    console.error(err);
    res.status(500).send(err);
  }
});

// Like Post
const likePost = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.id);

  if (!post) {
    res.status(404);
    throw new Error("Post not found");
  }

  // Check if user has already liked the post
  const alreadyLiked = post.likes.find(
    (like) => like.user.toString() === req.user.id
  );

  // Check if user has already disliked the post
  const alreadyDisliked = post.dislikes.find(
    (dislike) => dislike.user.toString() === req.user.id
  );

  if (alreadyLiked) {
    // User has already liked the post, so remove the like
    post.likes = post.likes.filter(
      (like) => like.user.toString() !== req.user.id
    );
    post.likesCount--;
  } else {
    // User has not liked the post, so add the like
    post.likes.push({ user: req.user.id });
    post.likesCount++;
  }

  if (alreadyDisliked) {
    // User has already disliked the post, so remove the dislike
    post.dislikes = post.dislikes.filter(
      (dislike) => dislike.user.toString() !== req.user.id
    );
    post.dislikesCount--;
  }

  res.status(200).json(post);
  const updatedPost = await post.save();
});

// Dislike Post
const dislikePost = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.id);

  if (!post) {
    res.status(404);
    throw new Error("Post not found");
  }

  // Check if user has already disliked the post
  const alreadyDisliked = post.dislikes.find(
    (dislike) => dislike.user.toString() === req.user.id
  );

  // Check if user has already liked the post
  const alreadyLiked = post.likes.find(
    (like) => like.user.toString() === req.user.id
  );

  if (alreadyDisliked) {
    // User has already disliked the post, so remove the dislike
    post.dislikes = post.dislikes.filter(
      (dislike) => dislike.user.toString() !== req.user.id
    );
    post.dislikesCount--;
  } else {
    // User has not disliked the post, so add the dislike
    post.dislikes.push({ user: req.user.id });
    post.dislikesCount++;
  }

  if (alreadyLiked) {
    // User has already liked the post, so remove the like
    post.likes = post.likes.filter(
      (like) => like.user.toString() !== req.user.id
    );
    post.likesCount--;
  }

  res.status(200).json(post);

  const updatedPost = await post.save();
});

module.exports = {
  createPost,
  getPosts,
  getPostUser,
  getPostById,
  getDownload,
  uploadfile,
  addComment,
  deletePost,
  addReply,
  likePost,
  dislikePost,
};
