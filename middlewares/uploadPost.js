import multer from "multer";
import appError from "../utils/appError.js";

const uploadPost = multer({
  storage: multer.diskStorage({

    destination: function (req, file, cb) {
      if (file.mimetype.startsWith("image/")) {
        return cb(null, "uploads/posts/images");
      }
      if (file.mimetype.startsWith("video/")) {
        return cb(null, "uploads/posts/videos");
      }
      return cb(appError.create("File must be an image or video", 400));
    },

    filename: function (req, file, cb) {
      const ext = file.mimetype.split("/")[1];
      const fileName = `post-${Date.now()}.${ext}`;
      cb(null, fileName);
    },
    
  }),

  fileFilter: function (req, file, cb) {
    if (
      file.mimetype.startsWith("image/") ||
      file.mimetype.startsWith("video/")
    ) {
      return cb(null, true);
    }

    return cb(appError.create("File must be an image or video", 400), false);
  },

  limits: {
    fileSize: 50 * 1024 * 1024,
    files: 10,
    fields: 10,
  },
}).array("media", 10);

export default uploadPost;
