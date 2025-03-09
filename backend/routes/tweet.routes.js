import { Router } from "express";
import {
  createTweet,
  getUserTweets,
  updateTweet,
  deleteTweet,
} from "../controllers/tweet.controller.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js";

const router = Router();

// Create a new tweet - requires authentication
router.route("/").post(verifyJWT, createTweet);

// Get tweets from a specific user - public route, no auth required
router.route("/user/:userId").get(getUserTweets);

// Get the authenticated user's own tweets
router.route("/me").get(verifyJWT, (req, res) => {
  req.params.userId = req.user._id;
  getUserTweets(req, res);
});

// Update and delete operations on a specific tweet - require authentication
router
  .route("/:tweetId")
  .patch(verifyJWT, updateTweet)
  .delete(verifyJWT, deleteTweet);

export default router;
