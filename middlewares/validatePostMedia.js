import fs from "fs/promises";
import appError from "../utils/appError.js";
// import { deleteUploadedFiles } from "../utils/deleteUploadedFiles.js";

const deleteUploadedFiles = async (files) => {
  if (!files) return;
  for (const file of files) {
    try {
      await fs.unlink(file.path);
    } catch (err) {
      console.log("Failed to delete file:", file.path);
    }
  }
};  // to do

const validatePostMedia = async (req, res, next) => {
  const files = req.files;
  // Text post
  if (!files || files.length === 0) {
    return next();
  }
  const images = files.filter((file) => file.mimetype.startsWith("image/"));
  const videos = files.filter((file) => file.mimetype.startsWith("video/"));

  // post ==> image + vedio
  if (images.length > 0 && videos.length > 0) {
    await deleteUploadedFiles(files);
    return next(
      appError.create("Post can contain images or video, not both", 400),
    );
  }

  // Images
  if (images.length > 0) {
    if (images.length > 10) {
      await deleteUploadedFiles(files);
      return next(appError.create("Maximum 10 images are allowed", 400));
    }
    const hasLargeImage = images.some((file) => file.size > 2 * 1024 * 1024);
    if (hasLargeImage) {
      await deleteUploadedFiles(files);
      return next(appError.create("Image size cannot exceed 2MB", 400));
    }
    return next();
  }

  // Video
  if (videos.length > 0) {
    if (videos.length !== 1) {
      await deleteUploadedFiles(files);
      return next(appError.create("Only one video is allowed", 400));
    }
    if (videos[0].size > 50 * 1024 * 1024) {
      await deleteUploadedFiles(files);
      return next(appError.create("Video size cannot exceed 50MB", 400));
    }
    return next();
  }
  await deleteUploadedFiles(files);
  return next(appError.create("Invalid media type", 400));
};

export default validatePostMedia;
