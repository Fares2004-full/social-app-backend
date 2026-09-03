// middlewares/globalErrorHandler.js
import httpStateText from "../utils/httpStateText.js";

const globalErrorHandler = (error, req, res, next) => {
  if (error.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({
      status: httpStateText[400],
      message: "File size exceeds the allowed limit",
      data: null,
    });
  }

  console.error(error);
  res.status(error.statusCode || 500).json({
    status: error.statusText || httpStateText[500],
    message: error.message,
    data: null,
  });
};

export default globalErrorHandler;
