import { validationResult } from "express-validator";
import User from "../models/users.model.js";
import Posts from "../models/postes.model.js";
import httpStateText from "../utils/httpStateText.js";
import { generateAccessToken } from "../utils/generateJWT.js";
import AppError from "../utils/appError.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import catchAsync  from "../middlewares/catchAsync.js";
import { issueAuthTokens } from "../utils/authResponse.js";
import { deleteUploadedFiles } from "../utils/deleteUploadedFiles.js";
import refreshTokenCookieOptions from "../config/cookieOptions.js";
import sanitizeUser from "../utils/sanitizeUser.js";
import crypto from "crypto";
  import {
    sendActivationEmail,
    sendResetPasswordOTP,
  } from "../services/email.service.js";
import {
  isStrongEnoughPassword,
  isValidGmail,
} from "../utils/stringValidationRgex.js";

const getAllUsers = catchAsync (async (req, res) => {
  const limit = Number(req.query.limit) || 10;
  const page = Number(req.query.page) || 1;
  const skip = (page - 1) * limit;
  const users = await User.find(
    {},
    {
      __v: 0,
      password: 0,
      refreshToken: 0,
      resetPasswordToken: 0,
      emailVerificationToken: 0,
    },
  )
    .limit(limit)
    .skip(skip);
  res.json({
    status: httpStateText[200],
    data: {
      users,
    },
  });
});
const getSingleUsers = catchAsync (async (req, res, next) => {
  const user = await User.findById(req.params.id, {
    __v: 0,
    password: 0,
    refreshToken: 0,
    resetPasswordToken: 0,
    emailVerificationToken: 0,
  });
  if (!user) {
    const error = AppError.create("User not found", 404, httpStateText[404]);
    return next(error);
  }
  return res.json({ status: httpStateText[200], data: user });
});
const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");
// generate secret key  require('crypto').randomBytes(32).toString('hex')


const register = catchAsync (async (req, res, next) => {
  if (req.body == undefined) {
    const error = AppError.create("data is missing", 400, httpStateText[400]);
    return next(error);
  }

  const { name, email, password, age, role } = req.body;
  // console.log("req.file ===> ", req.file);
  if (!email || !password) {
    const error = AppError.create(
      "Email and Password are required",
      400,
      httpStateText[400],
    );
    return next(error);
  }
  if (!isValidGmail(email)) {
    return next(
      AppError.create(
        "Please provide a valid Gmail address",
        400,
        httpStateText[400],
      ),
    );
  }

  if (!isStrongEnoughPassword(password)) {
    return next(
      AppError.create(
        "Password must be at least 8 characters and include a letter and a number",
        400,
        httpStateText[400],
      ),
    );
  }

  const oldUser = await User.findOne({ email: email });
  console.log("oldUser ===> ", oldUser);
  if (oldUser) {
    const error = AppError.create(
      "User already exists",
      400,
      httpStateText[400],
    );
    return next(error);
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const activationToken = crypto.randomBytes(32).toString("hex");

  const newUser = new User({
    name,
    email,
    password: hashedPassword,
    age,
    role,
    avatar: req.file
      ? req.file.destination + "/" + req.file.filename
      : undefined,
    isVerified: false,
    emailVerificationToken: hashToken(activationToken),
    emailVerificationTokenExpires: Date.now() + 24 * 60 * 60 * 1000,
  });
  // const { accessToken, refreshToken } = await issueAuthTokens(newUser);
  // res.cookie("refreshToken", refreshToken, refreshTokenCookieOptions);

  // const userObj = sanitizeUser(newUser);
  // res.status(201).json({
  //   status: httpStateText[201],
  //   data: { user: userObj },
  //   accessToken,
  // });

  await newUser.save();
  try{  
      const info = await sendActivationEmail(newUser.email, activationToken);
      console.log("EMAIL SENT, messageId:", info?.messageId);
  }catch (error) {
    console.error("Error sending activation email:", error);
  }
  return res.status(201).json({
    status: httpStateText[201],
    message:
      "Registration successful. Please check your email to activate your account.",
  });
});

const activateAccount = catchAsync (async (req, res, next) => {
  const { token } = req.query;
  if (!token) {
    return next(
      AppError.create("Activation token is required", 400, httpStateText[400]),
    );
  }
  const user = await User.findOne({
    emailVerificationToken: hashToken(token),
    emailVerificationTokenExpires: {
      $gt: Date.now(),
    },
  });
  if (!user) {
    return next(
      AppError.create(
        "Invalid or expired activation link",
        400,
        httpStateText[400],
      ),
    );
  }

  user.isVerified = true;
  user.emailVerificationToken = null;
  user.emailVerificationTokenExpires = null;
  await user.save();
  return res.status(200).json({
    status: httpStateText[200],
    message: "Account activated successfully",
  });
});


const login = catchAsync (async (req, res, next) => {
  if (req.body == undefined) {
    const error = AppError.create("data is missing", 400, httpStateText[400]);
    return next(error);
  }
  const { email, password } = req.body;
  if (!email || !password) {
    const error = AppError.create(
      "Email and Password are required",
      400,
      httpStateText[400],
    );
    return next(error);
  }
  const user = await User.findOne({ email: email });
  if (!user) {
    const error = AppError.create("user not found", 400, httpStateText[400]);
    return next(error);
  }
if (!user.isVerified) {
  return next(
    AppError.create(
      "Please verify your email before logging in",
      403,
      httpStateText[403],
    ),
  );
}
  const matchedPassword = await bcrypt.compare(password, user.password);
  if (matchedPassword) {
    const { accessToken, refreshToken } = await issueAuthTokens(user);

    user.refreshToken = refreshToken; // save refresh Token in user table
    await user.save();

    res.cookie("refreshToken", refreshToken, refreshTokenCookieOptions);

    const userObj = sanitizeUser(user);

    return res.status(200).json({
      status: httpStateText[200],
      data: { user: userObj },
      accessToken,
    });
  } else {
    return next(
      AppError.create("Invalid email or password", 401, httpStateText[401]),
    );
  }
});

const refreshToken = catchAsync (async (req, res, next) => {
  const token = req.cookies.refreshToken;
  if (!token) {
    return next(
      AppError.create("No refresh token provided", 401, httpStateText[401]),
    );
  }

  const user = await User.findOne({ refreshToken: token });
  if (!user) {
    return next(
      AppError.create("Invalid refresh token", 403, httpStateText[403]),
    );
  }

  jwt.verify(token, process.env.JWT_REFRESH_SECRET, (err, decoded) => {
    if (err) {
      return next(
        AppError.create(
          "Refresh token expired or invalid",
          403,
          httpStateText[403],
        ),
      );
    }
    const newAccessToken = generateAccessToken({
      email: user.email,
      id: user._id,
      role: user.role,
    });
    res.json({ status: httpStateText[200], accessToken: newAccessToken });
  });
});

// OTP is stored hashed (sha256) so a DB leak alone can't be used to reset
// accounts. This is fine for a random one-time code because we always have
// the plaintext to hash-and-compare against (unlike login passwords, which
// need bcrypt's salt+slow-hash).
const hashOTP = (otp) => crypto.createHash("sha256").update(otp).digest("hex");
const forgotPassword = catchAsync (async (req, res, next) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) {
    return res.status(200).json({
      status: "success",
      message: "If the email exists, a code will be sent",
    });
  }
  const otp = crypto.randomInt(100000, 1000000).toString(); //583921
  user.resetPasswordOTP = hashOTP(otp);
  user.resetPasswordOTPExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
  await user.save();
  await sendResetPasswordOTP(user.email, otp);
  return res.status(200).json({
    status: "success",
    message: "Reset code sent to your email",
  });
});

const verifyResetOTP = catchAsync (async (req, res, next) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    return next(
      AppError.create("Email and otp are required", 400, httpStateText[400]),
    );
  }
  const user = await User.findOne({
    email,
    resetPasswordOTP: hashOTP(otp),
    resetPasswordOTPExpires: {
      $gt: Date.now(),
    },
  });
  if (!user) {
    return next(
      AppError.create("Invalid or expired code", 400, httpStateText[400]),
    );
  }

  // OTP is single-use: consume it now and hand back a one-time reset token
  // instead. The confirm-password page never sees or needs the OTP again.
  const resetToken = crypto.randomBytes(32).toString("hex");
  user.resetPasswordOTP = null;
  user.resetPasswordOTPExpires = null;
  user.resetPasswordToken = hashOTP(resetToken); // sha256 hash, same helper works for any string
  user.resetPasswordTokenExpires = Date.now() + 10 * 60 * 1000;
  await user.save();

  return res.status(200).json({
    status: httpStateText[200],
    message: "OTP verified",
    data: { resetToken },
  });
});

const resetPassword = catchAsync (async (req, res, next) => {
  const { resetToken, newPassword } = req.body;
  if (!resetToken || !newPassword) {
    return next(
      AppError.create(
        "resetToken and newPassword are required",
        400,
        httpStateText[400],
      ),
    );
  }
  if (!isStrongEnoughPassword(newPassword)) {
    return next(
      AppError.create(
        "Password must be at least 8 characters and include a letter and a number",
        400,
        httpStateText[400],
      ),
    );
  }

  // this is the only thing that proves the OTP step actually happened —
  // there is no other path that sets resetPasswordToken
  const user = await User.findOne({
    resetPasswordToken: hashOTP(resetToken),
    resetPasswordTokenExpires: { $gt: Date.now() },
  });
  if (!user) {
    return next(
      AppError.create(
        "Invalid or expired reset session, please request a new code",
        400,
        httpStateText[400],
      ),
    );
  }

  user.password = await bcrypt.hash(newPassword, 10);
  user.passwordChangedAt = new Date();
  user.resetPasswordToken = null;
  user.resetPasswordTokenExpires = null;
  // invalidate any existing session so a leaked old token stops working
  user.refreshToken = null;
  await user.save();

  res.clearCookie("refreshToken");
  return res.status(200).json({
    status: httpStateText[200],
    message: "Password reset successfully",
  });
});

const logout = catchAsync (async (req, res, next) => {
  const token = req.cookies.refreshToken;
  if (token) {
    await User.findOneAndUpdate(
      { refreshToken: token },
      { refreshToken: null },
    );
  }
  res.clearCookie("refreshToken");
  res
    .status(200)
    .json({ status: httpStateText[200], data: { message: "logged out" } });
});

const updateUser = catchAsync (async (req, res, next) => {
  const id = req.params.id;
  const { name, age } = req.body;
  const avatar = req.file ? req.file.path : undefined;
  const user = await User.findByIdAndUpdate(
    id,
    {
      $set: {
        name,
        age,
        avatar,
      },
    },
    { returnDocument: "after", runValidators: true }, // runValidators: true to ensure that the updated data adheres to the schema validation rules
  );
  if (!user) {
    const error = AppError.create("User not found", 404, httpStateText[404]);
    return next(error);
  }
  res.json({ status: httpStateText[200], data: user });
});

const deleteUser = catchAsync (async (req, res, next) => {
  const id = req.params.id;
  const user = await User.findById(id);
  if (!user) {
    return next(AppError.create("User not found", 404, httpStateText[404]));
  }
  const posts = await Posts.find({ author: user.id });

  for (const post of posts) {
    await deleteUploadedFiles(post.media);
  }
  // to do how to make shore the done all correctley
  await Posts.deleteMany({ author: user._id });
  await deleteUploadedFiles(user.avatar);
  await User.findByIdAndDelete(id);

  res.status(200).json({
    status: httpStateText[200],
    data: {
      message: "User deleted",
    },
  });
});

export {
  getAllUsers,
  getSingleUsers,
  register,
  updateUser,
  deleteUser,
  login,
  refreshToken,
  logout,
  resetPassword,
  verifyResetOTP,
  forgotPassword,
  activateAccount,
};
