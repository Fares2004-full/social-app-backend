import Post from "../models/postes.model.js";
import httpStateText from "../utils/httpStateText.js";
import AppError from "../utils/appError.js";
import globalErrorHandler from "../middlewares/catchAsync.js";
import timeAgo from "../utils/timeAgo.js";
import { deleteUploadedFiles } from "../utils/deleteUploadedFiles.js";
// GET /api/posts
const getAllPosts = globalErrorHandler(async (req, res) => {
  const limit = Number(req.query.limit) || 10;
  const page = Number(req.query.page) || 1;
  const skip = (page - 1) * limit;

  const posts = await Post.find({}, { __v: 0 })
    .populate("author", "name email")
    .limit(limit)
    .skip(skip);

  const postsWithModifiedTime = posts.map((post) => {
    const postObject = post.toObject();
    return {
      ...postObject,
      createdAt: timeAgo(postObject.createdAt),
    };
  });

  console.log(postsWithModifiedTime);

  res.json({
    status: httpStateText[200],
    data: { postsWithModifiedTime },
  });
});

// GET /api/posts/:id
const getSinglePost = globalErrorHandler(async (req, res, next) => {
  const post = await Post.findById(req.params.id).populate(
    "author",
    "name email",
  );
  if (!post) {
    return next(AppError.create("Post not found", 404, httpStateText[404]));
  }
  res.json({ status: httpStateText[200], data: { post } });
});

// POST /api/posts
const createPost = globalErrorHandler(async (req, res, next) => {
  console.log("req.file ===> ", req.files);

  const { title, content } = req.body;

  let media = null;

  if (req.files && req.files.length > 0) {
    media = req.files.map((file) => file.destination + "/" + file.filename);
  }
  const newPost = new Post({
    title,
    content,
    media,
    author: req.currentUser.id,
  });

  await newPost.save();
  res.status(201).json({ status: httpStateText[201], data: { post: newPost } });
});

// PATCH /api/posts/:id
const updatePost = globalErrorHandler(async (req, res, next) => {
  const { title, content } = req.body;
  const post = await Post.findById(req.params.id);
  if (!post) {
    return next(AppError.create("Post not found", 404, httpStateText[404]));
  }
  if (post.author.toString() !== req.currentUser.id) {
    return next(
      AppError.create("Not allowed to edit this post", 403, httpStateText[403]),
    );
  }

  const updatedPost = await Post.findByIdAndUpdate(
    req.params.id,
    { $set: { title, content } },
    { returnDocument: "after", runValidators: true },
  );
  //     { returnDocument:"after" } return it after update
  res.json({ status: httpStateText[200], data: { post: updatedPost } });
});

// DELE TE /api/posts/:id
const deletePost = globalErrorHandler(async (req, res, next) => {
  const post = await Post.findById(req.params.id);
  if (!post) {
    return next(AppError.create("Post not found", 404, httpStateText[404]));
  }

  if (post.author.toString() !== req.currentUser.id) {
    return next(
      AppError.create(
        "Not allowed to delete this post",
        403,
        httpStateText[403],
      ),
    );
  }
  await deleteUploadedFiles(post.media);
  await Post.findByIdAndDelete(req.params.id);
  res.json({ status: httpStateText[200], data: { message: "Post deleted" } });
});

export { getAllPosts, getSinglePost, createPost, updatePost, deletePost };
