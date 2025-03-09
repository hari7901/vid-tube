import mongoose, { isValidObjectId } from "mongoose";
import { Like } from "../models/like.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const userId = req.user?._id;

  if (!videoId || !isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }

  const video = await mongoose.model("Video").findById(videoId);

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  const existingLike = await Like.findOne({
    video: videoId,
    likedBy: userId,
  });

  let like;
  let message;

  if (existingLike) {
    await Like.findByIdAndDelete(existingLike._id);
    message = "Video unliked succesfully";
    like = null;
  } else {
    // If like doesn't exist, create it (like)
    like = await Like.create({
      video: videoId,
      likedBy: userId,
    });
    message = "Video liked successfully";
  }

  return res
    .status(200)
    .json(new ApiResponse(200, { liked: !existingLike, like }, message));
});

const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const userId = req.user?._id;

 if (!commentId || !isValidObjectId(commentId)) {
   throw new ApiError(400, "Invalid comment id");
 }

  const comment = await mongoose.model("Comment").findById(commentId);

  if (!comment) {
    throw new ApiError(404, "Comment not found");
  }

  const existingLike = await Like.findOne({
    comment: commentId,
    likedBy: userId,
  });

  let like;
  let message;

  if (existingLike) {
    await Like.findByIdAndDelete(existingLike._id);
    message = "Comment unliked successfully";
    like = null;
  }
  // If like doesn't exist, create it (like)
  else {
    like = await Like.create({
      comment: commentId,
      likedBy: userId,
    });
    message = "Comment liked successfully";
  }

  return res
    .status(200)
    .json(new ApiResponse(200, { liked: !existingLike, like }, message));
});

const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  const userId = req.user?._id;

  if (!tweetId) {
    throw new ApiError(400, "Invalid tweet id");
  }

  const tweet = await mongoose.model("Tweet").findById(tweetId);

  if (!tweet) {
    throw new ApiError(404, "Tweet not found");
  }

  const existingLike = await Like.findOne({
    tweet: tweetId,
    likedBy: userId,
  });

  let like;
  let message;

  if (existingLike) {
    await Like.findByIdAndDelete(existingLike._id);
    message = "Comment unliked successfully";
    like = null;
  } else {
    like = await Like.create({
      tweet: tweetId,
      likedBy: userId,
    });
    message = "Comment liked successfully";
  }

  return res
    .status(200)
    .json(new ApiResponse(200, { liked: !existingLike, like }, message));
});

const getLikedVideos = asyncHandler(async (req, res) => {
  const userId = req.user?._id;

  // Get pagination parameters from query
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

  // Find all likes by this user and populate the video details
  const likedVideosAggregate = await Like.aggregate([
    // Match stage - only get likes by this user that have a video ID
    {
      $match: {
        likedBy: new mongoose.Types.ObjectId(userId),
        video: { $exists: true, $ne: null },
      },
    },
    // Lookup the video details
    {
      $lookup: {
        from: "videos", // Assuming your collection name is "videos"
        localField: "video",
        foreignField: "_id",
        as: "videoDetails",
        pipeline: [
          // Only include published videos
          { $match: { isPublished: true } },
          // Lookup the owner information for the video
          {
            $lookup: {
              from: "users", // Assuming your collection name is "users"
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
          // Convert the owner array to a single object
          {
            $addFields: {
              owner: { $first: "$owner" },
            },
          },
        ],
      },
    },
    // Unwind the videoDetails array
    {
      $unwind: {
        path: "$videoDetails",
        preserveNullAndEmptyArrays: false,
      },
    },
    // Project only the fields we need
    {
      $project: {
        _id: 0,
        video: "$videoDetails",
        likedAt: "$createdAt",
      },
    },
    // Count total matching documents for pagination
    {
      $facet: {
        metadata: [{ $count: "total" }],
        data: [
          { $skip: (pageNumber - 1) * limitNumber },
          { $limit: limitNumber },
        ],
      },
    },
  ]);

  // Extract the results and metadata
  const result = likedVideosAggregate[0];
  const totalVideos = result.metadata[0]?.total || 0;
  const likedVideos = result.data || [];

  // Calculate pagination information
  const totalPages = Math.ceil(totalVideos / limitNumber);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        likedVideos,
        pagination: {
          page: pageNumber,
          limit: limitNumber,
          totalVideos,
          totalPages,
          hasNextPage: pageNumber < totalPages,
          hasPrevPage: pageNumber > 1,
        },
      },
      "Liked videos fetched successfully"
    )
  );
});

export { toggleCommentLike, toggleTweetLike, toggleVideoLike, getLikedVideos };
