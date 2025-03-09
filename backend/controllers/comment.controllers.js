import mongoose, { isValidObjectId } from "mongoose";
import { Comment } from "../models/comment.models.js";
import { User } from "../models/user.models.js";
import { Video } from "../models/video.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getVideoComments = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  // Validate video ID
  if (!videoId || !mongoose.isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }

  // Check if video exists
  const videoExists = await mongoose.model("Video").findById(videoId);
  if (!videoExists) {
    throw new ApiError(404, "Video not found");
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

  // Create aggregation pipeline for paginated comments
  const commentAggregation = Comment.aggregate([
    // Match comments for the specific video
    {
      $match: {
        video: new mongoose.Types.ObjectId(videoId),
      },
    },
    // Sort by newest first
    {
      $sort: { createdAt: -1 },
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
              _id: 1,
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
  ]);

  // Use the mongoose-aggregate-paginate-v2 plugin for pagination
  const options = {
    page: pageNumber,
    limit: limitNumber,
    customLabels: {
      totalDocs: "totalComments",
      docs: "comments",
    },
  };

  const comments = await Comment.aggregatePaginate(commentAggregation, options);

  return res
    .status(200)
    .json(
      new ApiResponse(200, comments, "Video comments fetched successfully")
    );
});

// addComment - Add a new comment to a video
const addComment = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { content } = req.body;

  // Validate video ID
  if (!videoId || !mongoose.isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }

  // Validate content
  if (!content || !content.trim()) {
    throw new ApiError(400, "Comment content is required");
  }

  // Check if video exists
  const videoExists = await mongoose.model("Video").findById(videoId);
  if (!videoExists) {
    throw new ApiError(404, "Video not found");
  }

  // Create the comment
  const comment = await Comment.create({
    content: content.trim(),
    video: videoId,
    owner: req.user._id,
  });

  // Fetch the created comment with owner details
  const commentWithDetails = await Comment.findById(comment._id).populate(
    "owner",
    "_id username fullname avatar"
  );

  if (!commentWithDetails) {
    throw new ApiError(500, "Failed to create comment");
  }

  return res
    .status(201)
    .json(
      new ApiResponse(201, commentWithDetails, "Comment added successfully")
    );
});

// updateComment - Update an existing comment
const updateComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const { content } = req.body;

  // Validate comment ID
  if (!commentId || !mongoose.isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid comment ID");
  }

  // Validate content
  if (!content || !content.trim()) {
    throw new ApiError(400, "Comment content is required");
  }

  // Find the comment
  const comment = await Comment.findById(commentId);

  // Check if comment exists
  if (!comment) {
    throw new ApiError(404, "Comment not found");
  }

  // Check if the authenticated user is the owner of the comment
  if (comment.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You don't have permission to update this comment");
  }

  // Update the comment
  const updatedComment = await Comment.findByIdAndUpdate(
    commentId,
    {
      $set: {
        content: content.trim(),
      },
    },
    {
      new: true,
    }
  ).populate("owner", "_id username fullname avatar");

  return res
    .status(200)
    .json(new ApiResponse(200, updatedComment, "Comment updated successfully"));
});

// deleteComment - Delete a comment
const deleteComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  // Validate comment ID
  if (!commentId || !mongoose.isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid comment ID");
  }

  // Find the comment
  const comment = await Comment.findById(commentId);

  // Check if comment exists
  if (!comment) {
    throw new ApiError(404, "Comment not found");
  }

  // Check if the authenticated user is the owner of the comment
  if (comment.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You don't have permission to delete this comment");
  }

  // Delete the comment
  await Comment.findByIdAndDelete(commentId);

  // Also delete any likes associated with this comment (optional)
  try {
    await mongoose.model("Like").deleteMany({ comment: commentId });
  } catch (error) {
    console.error("Error deleting comment likes:", error);
    // Continue even if this clean-up step fails
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, { deleted: true }, "Comment deleted successfully")
    );
});

export { getVideoComments, addComment, updateComment, deleteComment };
