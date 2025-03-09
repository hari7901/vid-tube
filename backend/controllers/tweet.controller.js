import mongoose, { isValidObjectId } from "mongoose";
import { Tweet } from "../models/tweet.models.js";
import { User } from "../models/user.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createTweet = asyncHandler(async (req, res) => {
  const { content } = req.body;

  if (!content || !content.trim()) {
    throw new ApiError(400, "Invalid Tweet id");
  }

  const tweet = await Tweet.create({
    content: content.trim(),
    owner: req.user?._id,
  });

  if (content.length > 280) {
    throw new ApiError(
      400,
      "Tweet content exceeds maximum length of 280 characters"
    );
  }
  if (!tweet) {
    throw new ApiError(500, "Failed to create tweet");
  }

  return res
    .status(200)
    .json(new ApiResponse(201, tweet, "Tweet created successfully"));
});

const getUserTweets = asyncHandler(async (req, res) => {
  // Get userId from params
  const { userId } = req.params;

  // Validate user ID
  if (!userId || !mongoose.isValidObjectId(userId)) {
    throw new ApiError(400, "Invalid user ID");
  }

  // Validate that the user exists
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Get pagination parameters
  const { page = 1, limit = 10 } = req.query;
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

  // Create aggregation pipeline to get tweets with user info and like counts
  const tweets = await Tweet.aggregate([
    // Match tweets by the target user
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
      },
    },
    // Sort by creation date (newest first)
    {
      $sort: { createdAt: -1 },
    },
    // Apply pagination
    {
      $skip: skip,
    },
    {
      $limit: limitNumber,
    },
    // Lookup owner details
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        pipeline: [
          {
            $project: {
              username: 1,
              fullname: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
    // Convert owner array to single object
    {
      $addFields: {
        owner: { $first: "$owner" },
      },
    },
    // Lookup like count
    {
      $lookup: {
        from: "likes",
        let: { tweetId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$tweet", "$$tweetId"] },
                  { $ne: ["$tweet", null] },
                ],
              },
            },
          },
          {
            $count: "likeCount",
          },
        ],
        as: "likeInfo",
      },
    },
    // Add like count field
    {
      $addFields: {
        likeCount: {
          $cond: {
            if: { $gt: [{ $size: "$likeInfo" }, 0] },
            then: { $arrayElemAt: ["$likeInfo.likeCount", 0] },
            else: 0,
          },
        },
      },
    },
    // Remove likeInfo field from output
    {
      $project: {
        likeInfo: 0,
      },
    },
  ]);

  // Get total count of tweets for pagination info
  const totalTweets = await Tweet.countDocuments({ owner: userId });
  const totalPages = Math.ceil(totalTweets / limitNumber);

  // Check if req.user exists and if the user is viewing their own tweets
  // We don't use this for filtering, just for additional response info
  const isOwnProfile = req.user ? req.user._id.toString() === userId : false;

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        tweets,
        pagination: {
          page: pageNumber,
          limit: limitNumber,
          totalTweets,
          totalPages,
          hasNextPage: pageNumber < totalPages,
          hasPrevPage: pageNumber > 1,
        },
        isOwnProfile,
      },
      "Tweets fetched successfully"
    )
  );
});

const updateTweet = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  const { content } = req.body;

  if (!tweetId || !isValidObjectId(tweetId)) {
    throw new ApiError(400, "Invalid tweet ID");
  }

  // Validate content
  if (!content || !content.trim()) {
    throw new ApiError(400, "Tweet content is required");
  }

  if (content.length > 280) {
    throw new ApiError(
      400,
      "Tweet content exceeds maximum length of 280 characters"
    );
  }

  const tweet = await Tweet.findById(tweetId);

  if (!tweet) {
    throw new ApiError(404, "Tweet not found");
  }

  if (tweet.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(403, "You don't have permission to update this tweet");
  }

  const updatedTweet = await Tweet.findByIdAndUpdate(
    tweetId,
    { $set: { content: content.trim() } },
    { new: true }
  );

  return res
    .status(200)
    .json(new ApiResponse(200, updatedTweet, "Tweet updated successfully"));
});

const deleteTweet = asyncHandler(async (req, res) => {
  // Get tweet ID from params
  const { tweetId } = req.params;

  // Validate tweet ID
  if (!tweetId || !isValidObjectId(tweetId)) {
    throw new ApiError(400, "Invalid tweet ID");
  }

  // Find the tweet
  const tweet = await Tweet.findById(tweetId);

  // Check if tweet exists
  if (!tweet) {
    throw new ApiError(404, "Tweet not found");
  }

  // Check if the authenticated user is the owner of the tweet
  if (tweet.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(403, "You don't have permission to delete this tweet");
  }

  // Delete the tweet
  await Tweet.findByIdAndDelete(tweetId);

  // Also delete any associated likes
  try {
    await mongoose.model("Like").deleteMany({ tweet: tweetId });
  } catch (error) {
    // Log the error but don't fail the request if like deletion fails
    console.error("Error deleting associated likes:", error);
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, { deleted: true }, "Tweet deleted successfully")
    );
});

export { createTweet, getUserTweets, updateTweet, deleteTweet };
