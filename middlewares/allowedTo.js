import appError from "../utils/appError.js";
import httpStateText from "../utils/httpStateText.js";

export default function allowedTo(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.currentUser.role))
      return next(
        appError.create("this role is not authorized", 401, httpStateText[401]),
      );
  next();
  };
} 
