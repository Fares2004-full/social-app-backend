import mongoose from "mongoose";
import validator from "validator";
import userRoles from "../utils/userRoles.js";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "name is required"],
      trim: true,
    },
    age: {
      type: Number,
      min: [20, "Age less than 20"],
      max: [120, "not valid age"],
    },
    email: {
      type: String,
      required: [true, "email is required"],
      unique: [true, "email exist"],
      validate: [validator.isEmail, "not valid email"],
      trim: true,
    },
    password: {
      type: String,
      required: [true, "passwored is required"],
      // select: false, ////////// askkkkkkkk
    },
    resetPasswordOTP: {
      type: String,
      default: null,
    },

    resetPasswordOTPExpires: {
      type: Date,
      default: null,
    },

    // issued only after a correct OTP is verified — the actual "new password"
    // step uses this instead of the OTP, so it can never be reached without
    // having passed the OTP check first
    resetPasswordToken: {
      type: String,
      default: null,
    },

    resetPasswordTokenExpires: {
      type: Date,
      default: null,
    },
    passwordChangedAt: {
      type: Date,
      default: null,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: {
      type: String,
      default: null,
    },

    emailVerificationTokenExpires: {
      type: Date,
      default: null,
    },
    refreshToken: {
      type: String,
      default: null,
      // select: false,
    },
    role: {
      type: String,
      enum: [userRoles.ADMIN, userRoles.MANGER, userRoles.USER],
      default: userRoles.USER,
    },
    avatar: {
      type: String,
      default: "uploads/default.webp",
    },
  },
  { timestamps: true },
);
const User = mongoose.model("User", userSchema);
export default User;
