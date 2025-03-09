import mongoose from "mongoose";
import { Video } from "../models/video.models.js";
import { Subscription } from "../models/subscription.models.js";
import { Like } from "../models/like.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getChannelStats = asyncHandler(async (req, res) => {
  // Get the authenticated user's ID
  const channelId = req.user?._id;

  if (!channelId) {
    throw new ApiError(401, "Unauthorized access");
  }

  // Get total subscribers
  const totalSubscribers = await Subscription.countDocuments({
    channel: channelId,
  });

  // Get total videos and views
  const videoStats = await Video.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(channelId),
      },
    },
    {
      $group: {
        _id: null,
        totalVideos: { $sum: 1 },
        totalViews: { $sum: "$views" },
      },
    },
  ]);

  // Get total likes on all videos
  const likesOnVideos = await Like.aggregate([
    {
      $lookup: {
        from: "videos",
        localField: "video",
        foreignField: "_id",
        as: "videoDetails",
      },
    },
    {
      $unwind: "$videoDetails",
    },
    {
      $match: {
        "videoDetails.owner": new mongoose.Types.ObjectId(channelId),
      },
    },
    {
      $group: {
        _id: null,
        totalLikes: { $sum: 1 },
      },
    },
  ]);

  // Get video distribution by month (last 6 months)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const videosByMonth = await Video.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(channelId),
        createdAt: { $gte: sixMonthsAgo },
      },
    },
    {
      $group: {
        _id: {
          month: { $month: "$createdAt" },
          year: { $year: "$createdAt" },
        },
        count: { $sum: 1 },
      },
    },
    {
      $sort: {
        "_id.year": 1,
        "_id.month": 1,
      },
    },
  ]);

  // Get most popular videos (top 5)
  const topVideos = await Video.find({
    owner: channelId,
  })
    .sort({ views: -1 })
    .limit(5)
    .select("title views thumbnail");

  // Compile all stats
  const stats = {
    totalSubscribers,
    totalVideos: videoStats[0]?.totalVideos || 0,
    totalViews: videoStats[0]?.totalViews || 0,
    totalLikes: likesOnVideos[0]?.totalLikes || 0,
    videosByMonth,
    topVideos,
  };

  return res
    .status(200)
    .json(new ApiResponse(200, stats, "Channel stats fetched successfully"));
});

const getChannelVideos = asyncHandler(async (req, res) => {
  const channelId = req.user?._id;
  const {
    page = 1,
    limit = 10,
    sortBy = "createdAt",
    sortType = "desc",
  } = req.query;

  if (!channelId) {
    throw new ApiError(401, "Unauthorized access");
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

  // Set up sort configuration
  const sortOrder = sortType === "desc" ? -1 : 1;
  const validSortFields = ["createdAt", "views", "title", "duration"];
  const finalSortBy = validSortFields.includes(sortBy) ? sortBy : "createdAt";

  const sortConfig = {
    [finalSortBy]: sortOrder,
  };

  // Calculate skip value
  const skip = (pageNumber - 1) * limitNumber;

  // Get videos with pagination
  const videos = await Video.find({ owner: channelId })
    .sort(sortConfig)
    .skip(skip)
    .limit(limitNumber)
    .select("title description thumbnail views duration createdAt isPublished");

  // Get total count for pagination info
  const totalVideos = await Video.countDocuments({ owner: channelId });

  // Calculate pagination info
  const totalPages = Math.ceil(totalVideos / limitNumber);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        videos,
        pagination: {
          page: pageNumber,
          limit: limitNumber,
          totalVideos,
          totalPages,
          hasNextPage: pageNumber < totalPages,
          hasPrevPage: pageNumber > 1,
        },
      },
      "Channel videos fetched successfully"
    )
  );
});

export { getChannelStats, getChannelVideos };
