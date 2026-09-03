// routes/posts.routes.js
import express from "express";
import verifyToken from "../middlewares/verifyToken.js";
import {
  getAllPosts,
  getSinglePost,
  createPost,
  updatePost,
  deletePost,
} from "../controller/posts.controller.js";
import userRoles from "../utils/userRoles.js";
import allowedTo from "../middlewares/allowedTo.js";

// for upload media
import uploadPost from "../middlewares/uploadPost.js";
import validatePostMedia from "../middlewares/validatePostMedia.js";
const router = express.Router();

router
  .route("/")

  .get(getAllPosts)
  .post(verifyToken,
        uploadPost, 
        validatePostMedia, 
        createPost);

router
  .route("/:id")
  .get(getSinglePost)
  .patch(verifyToken, updatePost)
  .delete(
    verifyToken,
    deletePost,
  );

export default router;
