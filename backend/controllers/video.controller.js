import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.models.js"; // Changed to singular form
import { User } from "../models/user.models.js"; // Changed to singular form
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  deleteFromCloudinary,
  uploadOnCloudinary,
} from "../utils/cloudinary.js";

const getAllVideos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;

  const pageNumber = parseInt(page);
  const limitNumber = parseInt(limit);

  if (isNaN(pageNumber) || isNaN(limitNumber) || pageNumber < 1) {
    throw new ApiError(400, "Invalid pagination parameters");
  }

  const pipeline = [];

  // Match stage: only get published videos
  // Unless a specific userId is provided and it matches the requester
  const matchStage = { isPublished: true };

  if (userId) {
    if (!isValidObjectId(userId)) {
      throw new ApiError(400, "Invalid user Id");
    }

    // If user is requesting their own videos, show all (published and unpublished)
    // Otherwise, only show published videos from that user
    if (req.user?._id.toString() === userId) {
      matchStage.owner = new mongoose.Types.ObjectId(userId);
      delete matchStage.isPublished; // Remove the isPublished filter
    } else {
      matchStage.owner = new mongoose.Types.ObjectId(userId);
      // Keep the isPublished: true filter
    }
  }

  // Add text search if query parameter is provided
  if (query) {
    pipeline.push({
      $match: {
        $or: [
          { title: { $regex: query, $options: "i" } },
          { description: { $regex: query, $options: "i" } },
        ],
        ...matchStage,
      },
    });
  } else {
    // If no query, just use the basic match stage
    pipeline.push({ $match: matchStage });
  }

  pipeline.push({
    $lookup: {
      from: "users", // Changed to lowercase "users"
      localField: "owner",
      foreignField: "_id",
      as: "owner",
      pipeline: [
        // Fixed typo "piepline" to "pipeline"
        {
          $project: {
            fullname: 1,
            username: 1,
            avatar: 1,
          },
        },
      ],
    },
  });

  // Convert owner array to single object
  pipeline.push({
    $addFields: {
      owner: { $first: "$owner" },
    },
  });

  // Sort stage
  const sortOrder = sortType === "desc" ? -1 : 1;
  const validSortFields = ["createdAt", "views", "title", "duration"];
  const finalSortBy = validSortFields.includes(sortBy) ? sortBy : "createdAt";

  pipeline.push({
    $sort: {
      [finalSortBy]: sortOrder,
    },
  });

  // Create a separate pipeline for counting total documents
  const countPipeline = [...pipeline]; // Clone the pipeline
  countPipeline.push({ $count: "total" });

  // Execute the count pipeline
  const countResult = await Video.aggregate(countPipeline);
  const totalVideos = countResult.length > 0 ? countResult[0].total : 0;

  // Add pagination
  pipeline.push(
    { $skip: (pageNumber - 1) * limitNumber },
    { $limit: limitNumber }
  );

  // Execute the main pipeline
  const videos = await Video.aggregate(pipeline);

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
      "Videos fetched successfully"
    )
  );
});

const publishAVideo = asyncHandler(async (req, res) => {
  // 1. Get and validate required fields from request body
  const { title, description } = req.body; // Fixed q.body to req.body

  // Validate title and description
  if (!title || !title.trim()) {
    throw new ApiError(400, "Video title is required");
  }

  if (!description || !description.trim()) {
    throw new ApiError(400, "Video description is required");
  }

  // 2. Check if video and thumbnail files exist in the request
  const videoLocalPath = req.files?.videoFile?.[0]?.path;
  const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path;

  if (!videoLocalPath) {
    throw new ApiError(400, "Video file is required");
  }

  if (!thumbnailLocalPath) {
    throw new ApiError(400, "Thumbnail image is required");
  }

  // 3. Upload video and thumbnail to Cloudinary
  let videoFile;
  try {
    videoFile = await uploadOnCloudinary(videoLocalPath);

    if (!videoFile || !videoFile.url) {
      throw new ApiError(500, "Error uploading video file to Cloudinary");
    }
    // Removed stray "re;" statement

    console.log("Video uploaded successfully:", videoFile.url);
  } catch (error) {
    throw new ApiError(
      500,
      "Failed to upload video: " + (error.message || "Unknown error")
    );
  }

  let thumbnail;
  try {
    thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

    if (!thumbnail || !thumbnail.url) {
      // If thumbnail upload fails, clean up video file that was already uploaded
      if (videoFile && videoFile.public_id) {
        await deleteFromCloudinary(videoFile.public_id);
      }
      throw new ApiError(500, "Error uploading thumbnail to Cloudinary");
    }

    console.log("Thumbnail uploaded successfully:", thumbnail.url);
  } catch (error) {
    // Clean up video file that was already uploaded
    if (videoFile && videoFile.public_id) {
      await deleteFromCloudinary(videoFile.public_id);
    }
    throw new ApiError(
      500,
      "Failed to upload thumbnail: " + (error.message || "Unknown error")
    );
  }

  // 4. Create video document in database
  try {
    const video = await Video.create({
      title: title.trim(),
      description: description.trim(),
      videoFile: videoFile.url,
      videoFilePublicId: videoFile.public_id,
      thumbnail: thumbnail.url,
      thumbnailPublicId: thumbnail.public_id,
      duration: videoFile.duration || 0, // Cloudinary should return duration for videos
      owner: req.user._id, // Assuming req.user is set by auth middleware
      isPublished: true, // Default to published
    });

    // 5. Return the created video document
    return res
      .status(201)
      .json(new ApiResponse(201, video, "Video published successfully"));
  } catch (error) {
    // Clean up uploaded files if database operation fails
    if (videoFile && videoFile.public_id) {
      await deleteFromCloudinary(videoFile.public_id);
    }
    if (thumbnail && thumbnail.public_id) {
      await deleteFromCloudinary(thumbnail.public_id);
    }

    throw new ApiError(
      500,
      "Failed to publish video: " +
        (error.message || "Database operation failed")
    );
  }
});

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!videoId || !isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }

  const video = await Video.findById(videoId).populate({
    // Added await keyword
    path: "owner",
    select: "username fullname avatar",
  });

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  if (
    !video.isPublished &&
    (!req.user || req.user._id.toString() !== video.owner._id.toString())
  ) {
    throw new ApiError(403, "This video is not available");
  }

  if (req.user && req.user._id.toString() !== video.owner._id.toString()) {
    // Use findByIdAndUpdate to atomically increment the views
    await Video.findByIdAndUpdate(videoId, { $inc: { views: 1 } });
    video.views += 1;
  }

  if (req.user) {
    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: {
        watchHistory: videoId,
      },
    });
  }
  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video fetched successfully"));
});

const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { title, description } = req.body;

  // Validate videoId
  if (!videoId || !isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }

  // Find the video first to check ownership
  const video = await Video.findById(videoId);

  // Check if video exists
  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  // Check if the requester is the owner of the video
  if (video.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You don't have permission to update this video");
  }

  // Prepare update object with fields from request body
  const updateData = {};

  // Only add fields to the update object if they are provided in the request
  if (title && title.trim()) {
    updateData.title = title.trim();
  }

  if (description && description.trim()) {
    updateData.description = description.trim();
  }

  // Handle thumbnail update if a new file is uploaded
  const thumbnailLocalPath = req.file?.path;

  if (thumbnailLocalPath) {
    try {
      // Upload new thumbnail to Cloudinary
      const newThumbnail = await uploadOnCloudinary(thumbnailLocalPath);

      if (!newThumbnail || !newThumbnail.url) {
        throw new ApiError(500, "Error uploading thumbnail to Cloudinary");
      }

      // Add new thumbnail URL and public ID to update data
      updateData.thumbnail = newThumbnail.url;
      updateData.thumbnailPublicId = newThumbnail.public_id;

      // Delete old thumbnail from Cloudinary if it exists
      if (video.thumbnailPublicId) {
        await deleteFromCloudinary(video.thumbnailPublicId);
        console.log(
          "Old thumbnail deleted from Cloudinary:",
          video.thumbnailPublicId
        );
      }
    } catch (error) {
      throw new ApiError(
        500,
        "Failed to update thumbnail: " + (error.message || "Unknown error")
      );
    }
  }

  // If no fields to update were provided, return early
  if (Object.keys(updateData).length === 0) {
    throw new ApiError(400, "At least one field to update is required");
  }

  // Update the video with the new data
  const updatedVideo = await Video.findByIdAndUpdate(
    videoId,
    { $set: updateData },
    { new: true } // Return the updated document
  ).populate({
    path: "owner",
    select: "username fullname avatar",
  });

  return res
    .status(200)
    .json(new ApiResponse(200, updatedVideo, "Video updated successfully"));
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!videoId || !isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }

  const video = await Video.findById(videoId); // Added await keyword

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  if (video.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Unauthorized access");
  }

  try {
    if (video.videoFilePublicId) {
      await deleteFromCloudinary(video.videoFilePublicId);
      console.log(
        "Video file is deleted from Cloudinary: ",
        video.videoFilePublicId
      );
    }

    if (video.thumbnailPublicId) {
      await deleteFromCloudinary(video.thumbnailPublicId);
      console.log(
        "Thumbnail deleted from Cloudinary:",
        video.thumbnailPublicId
      );
    }
  } catch (error) {
    console.log("Error deleting files from Cloudinary:", error);
  }

  await Video.findByIdAndDelete(videoId);

  try {
    await User.updateMany(
      { watchHistory: videoId },
      { $pull: { watchHistory: videoId } }
    );
  } catch (error) {
    console.error("Error removing video from watch history:", error);
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, { deleted: true }, "Video deleted successfully")
    );
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!videoId || !isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }

  const video = await Video.findById(videoId); // Added await keyword

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  if (video.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Cannot change status");
  }

  const updatedVideo = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: {
        isPublished: !video.isPublished,
      },
    },
    { new: true }
  ).populate({
    path: "owner",
    select: "username fullname avatar",
  });

  const statusMessage = updatedVideo.isPublished
    ? "Video has been published successfully"
    : "Video has been unpublished successfully";

  return res
    .status(200)
    .json(new ApiResponse(200, updatedVideo, statusMessage));
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
