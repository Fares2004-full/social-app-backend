import express from "express";
import { validationSchema } from "../middlewares/validationScema.js";
const router = express.Router();
import verifyToken from "../middlewares/verifyToken.js";
import multer from "multer";
import uploadImage from "../middlewares/uploadImages.js";
import {
  getAllUsers,
  getSingleUsers,
  register,
  updateUser,
  deleteUser,
  login,
  refreshToken,
  logout,
  forgotPassword,
  verifyResetOTP,
  resetPassword,
  activateAccount,
} from "../controller/users.controller.js";
import appError from "../utils/appError.js";
import checkUserOwnership from "../middlewares/checkUserOwnership.js";
import { forgotPasswordLimiter, otpAttemptLimiter } from "../middlewares/otpRateLimiter.js"
//import { validationSchema, runValidation } from "../middlewares/validationScema.js"
import allowedTo from "../middlewares/allowedTo.js";
import userRoles from "../utils/userRoles.js";
router.route("/").get(verifyToken, allowedTo(userRoles.MANGER, userRoles.ADMIN), getAllUsers); // protected route
router
  .route("/register")
  .post(
    validationSchema(),
    uploadImage("avatars", 2, 1).single("avatar"),
    register,
  );
//router.route("/register").post(validationSchema(), runValidation, register);
router.route("/refresh").post(refreshToken);
router.route("/logout").post(verifyToken, logout);
router.route("/login").post(login);

router.route("/activate-account").get(activateAccount);
router.route("/forgot-password").post(forgotPasswordLimiter, forgotPassword);
router.route("/verify-reset-otp").post(otpAttemptLimiter, verifyResetOTP);
router.route("/reset-password").post(otpAttemptLimiter, resetPassword);
router
  .route("/:id")
  .get(getSingleUsers)
  /// put update all parts of a resourcs
  // patch update single part of a resourcs
  .patch(
    verifyToken,
    checkUserOwnership,
    uploadImage("avatars", 2, 1).single("avatar"),
    updateUser,
  )
  .delete(verifyToken, checkUserOwnership, deleteUser);

export default router;
