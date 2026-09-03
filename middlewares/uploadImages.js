import appError from "../utils/appError.js";
import multer from "multer";

const uploadImage = (folderName, size, noOfFiles) => {
  const handeleLImits = {};

  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, `uploads/${folderName}`);
    },

    filename: function (req, file, cb) {
      const ext = file.mimetype.split("/")[1];
      const fileName = `${folderName}-${Date.now()}.${ext}`;
      cb(null, fileName);
    },
  });

  const fileFilter = (req, file, cb) => {
      if (file.mimetype.startsWith("image/")) {
        cb(null, true);
      } 
      else {
        cb(appError.create("File must be animage ", 400), false);
      }

  };

  // limits to prevent DOS attack
  return multer({
    storage,
    fileFilter,
    limits: {
      fileSize: size * 1024 * 1024, // file size 2mp
      files: noOfFiles, // => no of files
      fields: 10, // => max no of fields in the form data
    },
  });
};

export default uploadImage;
