import express from "express";
import userRouter from "./routes/users.routes.js";
import postsRouter from "./routes/posts.routes.js";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import httpStateText from "./utils/httpStateText.js";
import globalErrorHandler from "./middlewares/globalErrorHandler.js";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config(); // read .env

// async function connectDB() {
//   try {
//     await mongoose.connect(process.env.MONGO_URI);
//     console.log("MongoDB Connected");

//     // const allData = await mongoose.connection.db
//     //   .collection("users")
//     //   .find()
//     //   .toArray();

//     // // console.log(allData);
//   } catch (err) {
//     console.log(err);
//   }
// }

// connectDB();

const app = express();

// search static route
const __filename = fileURLToPath(import.meta.url);
// import.meta.url curnt loaction of the file
const __dirname = path.dirname(__filename);
app.use("/uploads", express.static(path.join(__dirname, "uploads"))); // middleware

// cors is a middleware that allows cross-origin requests.
//  It is used to enable communication between the frontend and backend
//  when they are hosted on different domains or ports.
// axiosInstance.js =============> to handel refresh token noted
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  }),
);

app.use(express.json());

app.use(cookieParser());

app.use("/api/users", userRouter);
// 1 - schema
// 2 - router
// 3 - controller
// 4 - import index
app.use("/api/posts", postsRouter);

app.use((req, res) => {
  res.status(404).json({
    status: httpStateText[404],
    message: "Route not found",
  });
}); // This route will catch all requests that don't match any of the defined routes and return a 404 error.

app.use((error, req, res, next) => {
  if (error.code === "LIMIT_FILE_SIZE") {
    return next(
      res.status(400).json({
        status: error.statusText || httpStateText[400],
        message: "image size must not exceed 2MB",
        data: null,
      }),
    );
  }

  // This is a global error handler
  // that will catch any errors that occur in the application and return a 500 error.
  console.log("from middleware" + error);
  res.status(error.statusCode || 500).json({
    status: error.statusText || httpStateText[500],
    message: error.message,
    code: error.statusCode || 500,
    data: null,
  });
});
app.use(globalErrorHandler);

const startServer = async () => {
  // make shour database run succ 😊😊
  try {
    await mongoose.connect(process.env.MONGO_URI);

    console.log("MongoDB Connected");

    app.listen(process.env.PORT_NUMBER, () => {
      // console.log(`Server is running on port ${process.env.PORT_NUMBER}`);
    });
  } catch (error) {
    console.error("Database connection failed:", error);
  }
};

startServer();
