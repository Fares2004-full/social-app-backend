# My Social App — Backend

A REST API built with **Node.js / Express / MongoDB (Mongoose)** that supports user registration with email activation, JWT-based login (access + refresh tokens), password recovery via OTP, and file uploads (profile pictures / post media).

> Note: folder and route names below are inferred from the code in this project. If your actual structure differs, adjust accordingly.

---

## 📦 Tech Stack

- **Express** — HTTP server / routing
- **MongoDB + Mongoose** — database
- **jsonwebtoken (JWT)** — access & refresh tokens
- **bcryptjs** — password hashing
- **express-validator** — input validation
- **nodemailer** — sending emails (account activation + password reset code)
- **crypto (built-in)** — generating random tokens and hashing (sha256) them before storage

---

## 📁 Project Structure

```
├── .vscode/
├── config/
│   └── cookieOptions.js        # refreshToken cookie settings
├── controller/
│   ├── posts.controller.js
│   └── users.controller.js     # register, login, activation, password reset, etc.
├── middlewares/
│   ├── allowedTo.js            # role-based access control (e.g. admin-only routes)
│   ├── catchAsync.js           # wrapper to avoid try/catch in every controller
│   ├── checkUserOwnership.js   # ensures a user can only modify their own resources
│   ├── globalErrorHandler.js   # centralized Express error handler
│   ├── otpRateLimiter.js       # rate-limits OTP requests (forgot-password abuse protection)
│   ├── uploadImages.js         # multer config for image uploads
│   ├── uploadPost.js           # multer config for post media uploads
│   ├── validatePostMedia.js    # validates uploaded post files (type/size)
│   ├── validationScema.js      # express-validator schemas
│   └── verifyToken.js          # verifies JWT access token on protected routes
├── models/
│   ├── postes.model.js
│   └── users.model.js
├── node_modules/
├── routes/
│   ├── posts.routes.js
│   └── users.routes.js
├── services/
│   └── email.service.js        # sends activation + password reset emails
├── uploads/                     # stored avatar/post files (ignored by git)
├── utils/
│   ├── appError.js             # unified error class
│   ├── authResponse.js         # issues access/refresh tokens together
│   ├── deleteUploadedFiles.js  # deletes uploaded files (images) from the server
│   ├── generateJWT.js
│   ├── httpStateText.js        # HTTP status text (success/fail)
│   ├── sanitizeUser.js         # strips sensitive fields before sending to client
│   ├── sendResponse.js         # standardized success response helper
│   ├── stringValidationRgex.js # regex for email and password strength validation
│   ├── timeAgo.js              # relative time formatting (e.g. "5 minutes ago")
│   └── userRoles.js            # role constants (e.g. user/admin)
├── .env                         # (ignored by git)
├── .gitignore
├── index.js                     # app entry point
├── package.json
└── README.md
```

---

## ⚙️ Environment Variables (.env)

Create a `.env` file in the project root (already excluded via `.gitignore`):

```env
# Server
PORT=4000
CLIENT_URL=http://localhost:3000

# MongoDB
MONGO_URI=mongodb://localhost:27017/your-db-name

# JWT
JWT_ACCESS_SECRET=your_access_secret
JWT_REFRESH_SECRET=your_refresh_secret

# Email (Gmail)
EMAIL_USER=youraccount@gmail.com
EMAIL_APP_PASSWORD=your_gmail_app_password
```

> `EMAIL_APP_PASSWORD` must be a Google **App Password** (not your regular Gmail password). You need 2-Step Verification enabled on the Google account to generate one.

It's also recommended to create a `.env.example` file with the same variable names but no real values, and commit that instead, as a reference for anyone setting up the project.

---

## 🔐 Authentication Flow

### 1. Registration + Account Activation (`register` → `activateAccount`)

1. The user submits `name, email, password, age, role` (+ an optional avatar file).
2. Validation: the email must be a valid Gmail address, the password must be strong (at least 8 characters, including a letter and a number), and the email must not already be registered.
3. The password is hashed with `bcrypt` (10 rounds).
4. A random `activationToken` is generated (`crypto.randomBytes(32)`) and stored in the database **not as plain text but as a sha256 hash** — so that even if the database is leaked, the token can't be used directly.
5. The user is saved with `isVerified: false`.
6. An email is sent containing a link: `CLIENT_URL/activate-account?token=<the original, unhashed token>`.
7. When the user clicks the link, the frontend sends the token to `activateAccount`, which hashes the incoming token, compares it to the one stored in the database, and checks it hasn't expired (24 hours). If it matches, `isVerified` is set to `true`.

**Why hash the token before storing it?** Same principle as password storage — the original token only ever reaches the user via email, and the database only ever sees the hashed version, so nobody who reads the database can forge an activation.

### 2. Login (`login`)

1. Confirms both email and password were provided.
2. Rejects login if the account isn't yet activated (`isVerified === false`).
3. Compares the password using `bcrypt.compare`.
4. On success, generates a short-lived `accessToken` (returned in the response body) and a `refreshToken` (stored in an **httpOnly cookie** and also saved on the user document in the database).
5. The response returns sanitized user data (`sanitizeUser` strips the password and other sensitive tokens).

### 3. Refreshing the Access Token (`refreshToken`)

1. Reads the `refreshToken` from the cookie.
2. Looks up a user whose stored refresh token matches (meaning the token is "known" and hasn't been invalidated by a prior logout).
3. Verifies the token's validity with `jwt.verify` using `JWT_REFRESH_SECRET`.
4. On success, issues a new `accessToken` only (the refresh token itself is left unchanged).

### 4. Forgot Password (`forgotPassword` → `verifyResetOTP` → `resetPassword`)

This is a 3-step flow for security:

1. **`forgotPassword`**: takes the email; if it exists, generates a 6-digit OTP (`crypto.randomInt`), stores its hash in `resetPasswordOTP` with a 10-minute expiry, and emails it to the user. **Even if the email doesn't exist, the response returns the same success message** — this prevents user enumeration (letting an attacker discover which emails are registered).

2. **`verifyResetOTP`**: takes the email and OTP, compares the hash. If valid and not expired, it clears the OTP (single-use) and generates a new `resetToken` (stored hashed in `resetPasswordToken`, 10-minute expiry), returned to the frontend.

3. **`resetPassword`**: takes the `resetToken` and `newPassword`. Verifies the token matches the one issued after OTP verification and hasn't expired. On success, updates the password and clears any existing `refreshToken` — meaning any previously logged-in session is automatically invalidated (an important safeguard in case the old password was compromised).

### 5. Logout (`logout`)

Clears the `refreshToken` from both the database and the cookie, so even a stolen copy of the old cookie stops working.

---

## 🛡️ Middlewares

- **`verifyToken.js`** — checks the `accessToken` (usually sent as `Authorization: Bearer <token>`) on protected routes and attaches the decoded user to `req.user`.
- **`allowedTo.js`** — role-based access control; restricts a route to specific roles (e.g. only `admin` can delete any user).
- **`checkUserOwnership.js`** — makes sure the logged-in user can only update/delete resources (posts, profile) that belong to them, not someone else's.
- **`otpRateLimiter.js`** — limits how often a client can request a password-reset OTP for the same email/IP, to prevent abuse of `forgotPassword` (spamming someone's inbox, or brute-forcing OTPs).
- **`uploadImages.js` / `uploadPost.js`** — multer configurations for handling avatar and post-media uploads respectively (destination, filename, size/type limits).
- **`validatePostMedia.js` / `validationScema.js`** — validate request bodies and uploaded files before they reach the controller (paired with `express-validator` + `validationResult`).
- **`globalErrorHandler.js`** — the final Express error-handling middleware; formats every `AppError` (and unexpected errors) into a consistent JSON response.
- **`catchAsync.js`** — wraps async controller functions so any rejected promise is automatically forwarded to `globalErrorHandler` via `next(err)`, avoiding repetitive try/catch blocks.

---

## 👤 Users & 📝 Posts

- `getAllUsers` / `getSingleUsers`: return user data with sensitive fields (`password`, `refreshToken`, `resetPasswordToken`, `emailVerificationToken`) excluded directly at the query level (projection) — more efficient than sanitizing in application code since it happens at the database layer.
- `updateUser`: updates `name`, `age`, and `avatar` (if a new image was uploaded).
- `deleteUser`: manual cascading delete —
  1. Finds all of the user's posts.
  2. Deletes each post's media files from the server (`deleteUploadedFiles`).
  3. Deletes the posts themselves from the database.
  4. Deletes the user's avatar file.
  5. Deletes the user document.

---

## 🚀 Running Locally

```bash
# 1. Install dependencies
npm install

# 2. Create a .env file (see Environment Variables section above)

# 3. Run MongoDB locally, or point MONGO_URI to an Atlas cluster

# 4. Start the server
npm run dev
```

The server will run on `http://localhost:PORT` (as set in `.env`).

---

## ⚠️ Security Notes

- Never commit `.env` to git — use `.env.example` instead.
- If `EMAIL_APP_PASSWORD` or `JWT_*_SECRET` are ever exposed (even accidentally pushed to git), **rotate them immediately** at their source (Google App Passwords / your own secrets).
- All sensitive tokens (activation, reset OTP, reset token) are stored as **hashes** in the database, never as plain text.
