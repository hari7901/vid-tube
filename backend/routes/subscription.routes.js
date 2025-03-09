import { Router } from "express";
import {
  toggleSubscription,
  getUserChannelSubscribers,
  getSubscribedChannels,
} from "../controllers/subscription.controllers.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js";

const router = Router();

// Toggle subscription status (subscribe/unsubscribe)
router.route("/c/:channelId").post(verifyJWT, toggleSubscription);

// Get all subscribers of a channel
router.route("/c/:channelId/subscribers").get(getUserChannelSubscribers);

// Get all channels a user has subscribed to
router.route("/u/:subscriberId/channels").get(getSubscribedChannels);

// Get authenticated user's subscribed channels
router.route("/me/channels").get(verifyJWT, (req, res) => {
  // Redirect to the user's own ID
  const subscriberId = req.user?._id;
  req.params.subscriberId = subscriberId;
  getSubscribedChannels(req, res);
});

export default router;
