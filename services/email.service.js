// services/email.service.js
import nodemailer from "nodemailer";

// const transporter = nodemailer.createTransport({
//   service: "gmail",
//   auth: {
//     user: process.env.EMAIL_USER,
//     pass: process.env.EMAIL_APP_PASSWORD,
//   },
// });

export const sendActivationEmail = async (email, activationToken) => {
  console.log(email);
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_APP_PASSWORD,
    },
  });
  console.log(activationToken);

  const activationUrl = `${process.env.CLIENT_URL}/activate-account?token=${activationToken}`;
    // console.log("Sending activation email..." + process.env.CLIENT_URL);
  let info = await transporter.sendMail({
    from: `"My Social App" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Activate Your Account",
    html: `
      <h2>Welcome!</h2>
      <p>Please click the button below to activate your account:</p>
      <a href="${activationUrl}">Activate Account</a>
      <p>This link expires in 24 hours.</p>
    `,
  });
  return info
};

export const sendResetPasswordOTP = async (email, otp) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_APP_PASSWORD,
    },
  });

  await transporter.sendMail({
    from: `"My Social App" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Password Reset Code",
    html: `
      <h2>Password Reset</h2>
      <p>Your password reset code is:</p>
      <h1>${otp}</h1>
      <p>This code will expire in 10 minutes.</p>
    `,
  });
};
