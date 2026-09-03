// utils/sendResponse.js
const sendResponse = (res, statusCode, data = null, message = null) => {
  return res.status(statusCode).json({
    status: statusCode < 400 ? "success" : "fail",
    message,
    data,
  });
};

export default sendResponse;
