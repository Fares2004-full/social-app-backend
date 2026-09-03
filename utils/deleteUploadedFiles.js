import fs from "fs/promises";

export const deleteUploadedFiles = async (files) => {
  if (!files) return;
  if(typeof files ==="string"){
    files=[files];
  }
  for (const filePath of files) {
    try {
      await fs.unlink(filePath);
    } catch (err) {
      console.log("Failed to delete file:", filePath);
    }
  }
};