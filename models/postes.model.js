import mongoose from "mongoose";
const PostSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      required: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    view: { type: Number },
    media: {
      type: [String],
      default: null,
    },
  },
  { timestamps: true }, ////////// askkkkkkkkkk
);

const Posts = mongoose.model("Post", PostSchema);
export default Posts;
