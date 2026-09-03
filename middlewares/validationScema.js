import { body, validationResult } from "express-validator";
import AppError from "../utils/appError.js";
import httpStateText from "../utils/httpStateText.js";

export const validationSchema = () => {
  return [
    body("name")
      .trim()
      .notEmpty()
      .withMessage("Name is required")
      .isLength({ min: 2 })
      .withMessage("Name must be at least 2 characters"),

    body("age")
      .optional()
      .isInt({ min: 20, max: 120 })
      .withMessage("Age must be a number between 20 and 120"),

    body("email")
      .trim()
      .notEmpty()
      .withMessage("Email is required")
      .isEmail()
      .withMessage("Invalid email"),

    body("password")
      .notEmpty()
      .withMessage("Password is required")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters"),
  ];
};

export const runValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(
      AppError.create(errors.array()[0].msg, 422, httpStateText[422]),);
  }
  next();
};
