import mongoose, { isValidObjectId } from "mongoose";
import { User } from "../models/user.models.js";
import { Subscription } from "../models/subscription.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleSubscription = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  const subscriberId = req.user?._id;

  // Validate channel ID
  if (!channelId || !isValidObjectId(channelId)) {
    throw new ApiError(400, "Invalid channel ID");
  }

  // Check if channel exists
  const channel = await User.findById(channelId);
  if (!channel) {
    throw new ApiError(404, "Channel not found");
  }

  // Prevent self-subscription
  if (channelId.toString() === subscriberId.toString()) {
    throw new ApiError(400, "You cannot subscribe to your own channel");
  }

  // Check if already subscribed
  const existingSubscription = await Subscription.findOne({
    subscriber: subscriberId,
    channel: channelId,
  });

  let subscription;
  let message;

  // If already subscribed, unsubscribe
  if (existingSubscription) {
    await Subscription.findByIdAndDelete(existingSubscription._id);
    message = "Unsubscribed successfully";
    subscription = null;
  }
  // If not subscribed, subscribe
  else {
    subscription = await Subscription.create({
      subscriber: subscriberId,
      channel: channelId,
    });
    message = "Subscribed successfully";
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { subscribed: !existingSubscription, subscription },
        message
      )
    );
});

// getUserChannelSubscribers - Get all subscribers of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  // Validate channel ID
  if (!channelId || !isValidObjectId(channelId)) {
    throw new ApiError(400, "Invalid channel ID");
  }

  // Check if channel exists
  const channel = await User.findById(channelId);
  if (!channel) {
    throw new ApiError(404, "Channel not found");
  }

  // Convert page and limit to numbers
  const pageNumber = parseInt(page);
  const limitNumber = parseInt(limit);

  // Validate pagination parameters
  if (
    isNaN(pageNumber) ||
    isNaN(limitNumber) ||
    pageNumber < 1 ||
    limitNumber < 1
  ) {
    throw new ApiError(400, "Invalid pagination parameters");
  }

  // Calculate skip value for pagination
  const skip = (pageNumber - 1) * limitNumber;

  // Aggregate pipeline to get subscribers with details
  const subscribersAggregate = await Subscription.aggregate([
    // Match stage - get all subscriptions for the channel
    {
      $match: {
        channel: new mongoose.Types.ObjectId(channelId),
      },
    },
    // Lookup subscriber details
    {
      $lookup: {
        from: "users",
        localField: "subscriber",
        foreignField: "_id",
        as: "subscriberDetails",
        pipeline: [
          {
            $project: {
              _id: 1,
              username: 1,
              fullname: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
    // Convert the subscriberDetails array to a single object
    {
      $addFields: {
        subscriberDetails: { $first: "$subscriberDetails" },
      },
    },
    // Facet for pagination
    {
      $facet: {
        metadata: [{ $count: "total" }],
        data: [{ $skip: skip }, { $limit: limitNumber }],
      },
    },
  ]);

  // Extract results and metadata
  const result = subscribersAggregate[0];
  const totalSubscribers = result.metadata[0]?.total || 0;
  const subscribers = result.data.map((sub) => sub.subscriberDetails);

  // Calculate pagination info
  const totalPages = Math.ceil(totalSubscribers / limitNumber);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        subscribers,
        pagination: {
          page: pageNumber,
          limit: limitNumber,
          totalSubscribers,
          totalPages,
          hasNextPage: pageNumber < totalPages,
          hasPrevPage: pageNumber > 1,
        },
      },
      "Channel subscribers fetched successfully"
    )
  );
});

// getSubscribedChannels - Get all channels a user has subscribed to
const getSubscribedChannels = asyncHandler(async (req, res) => {
  const { subscriberId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  // If subscriberId is not provided, use the authenticated user's ID
  const userId = subscriberId || req.user?._id;

  // Validate subscriber ID
  if (!userId || !isValidObjectId(userId)) {
    throw new ApiError(400, "Invalid subscriber ID");
  }

  // Check if user exists
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Convert page and limit to numbers
  const pageNumber = parseInt(page);
  const limitNumber = parseInt(limit);

  // Validate pagination parameters
  if (
    isNaN(pageNumber) ||
    isNaN(limitNumber) ||
    pageNumber < 1 ||
    limitNumber < 1
  ) {
    throw new ApiError(400, "Invalid pagination parameters");
  }

  // Calculate skip value for pagination
  const skip = (pageNumber - 1) * limitNumber;

  // Aggregate pipeline to get subscribed channels with details
  const channelsAggregate = await Subscription.aggregate([
    // Match stage - get all subscriptions by the user
    {
      $match: {
        subscriber: new mongoose.Types.ObjectId(userId),
      },
    },
    // Lookup channel details
    {
      $lookup: {
        from: "users",
        localField: "channel",
        foreignField: "_id",
        as: "channelDetails",
        pipeline: [
          {
            $project: {
              _id: 1,
              username: 1,
              fullname: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
    // Convert the channelDetails array to a single object
    {
      $addFields: {
        channelDetails: { $first: "$channelDetails" },
      },
    },
    // Facet for pagination
    {
      $facet: {
        metadata: [{ $count: "total" }],
        data: [{ $skip: skip }, { $limit: limitNumber }],
      },
    },
  ]);

  // Extract results and metadata
  const result = channelsAggregate[0];
  const totalChannels = result.metadata[0]?.total || 0;
  const channels = result.data.map((sub) => sub.channelDetails);

  // Calculate pagination info
  const totalPages = Math.ceil(totalChannels / limitNumber);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        channels,
        pagination: {
          page: pageNumber,
          limit: limitNumber,
          totalChannels,
          totalPages,
          hasNextPage: pageNumber < totalPages,
          hasPrevPage: pageNumber > 1,
        },
      },
      "Subscribed channels fetched successfully"
    )
  );
});

export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels };
