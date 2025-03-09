import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

// In your backend app.js file
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "http://localhost:5500",
      "http://127.0.0.1:5500",
    ], // Allow all your frontend origins
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// avoid unlimited data json data
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());
app.get("/healthcheck");

// import routes
import healthCheckRouter from "./routes/healthcheck.routes.js";
import userRouter from "./routes/user.routes.js";
import videoRouter from "./routes/video.routes.js";
import likeRouter from "./routes/like.routes.js";
import tweetRouter from "./routes/tweet.routes.js";
import playlistRouter from "./routes/playlist.routes.js";
import commentRouter from "./routes/comment.routes.js";
import subsciptionRouter from "./routes/subscription.routes.js";
import dashboardRouter from "./routes/dashboard.routes.js";

//routes
app.use("/api/v1/healthcheck", healthCheckRouter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1/videos", videoRouter);
app.use("/api/v1/likes", likeRouter);
app.use("/api/v1/tweets", tweetRouter);
app.use("/api/v1/playlists", playlistRouter);
app.use("/api/v1/comments", commentRouter);
app.use("/api/v1/subscriptions", subsciptionRouter);
app.use("/api/v1/dashboard", dashboardRouter);

export { app };
