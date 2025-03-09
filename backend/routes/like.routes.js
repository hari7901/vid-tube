import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middlewares.js";
import {
  getLikedVideos,
  toggleCommentLike,
  toggleTweetLike,
  toggleVideoLike,
} from "../controllers/like.controller.js";

const router = Router();

router.route("/toggle/videos/:videoId").post(verifyJWT, toggleVideoLike);
router.route("/toggle/comments/:commentId").post(verifyJWT, toggleCommentLike);
router.route("/toggle/tweets/:tweetId").post(verifyJWT, toggleTweetLike);
router.route("/liked-videos").get(verifyJWT, getLikedVideos);

export default router;
