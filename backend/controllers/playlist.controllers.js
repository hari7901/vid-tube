import { asyncHandler } from "../utils/asyncHandler.js";
import { Playlist } from "../models/playlist.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import mongoose, { isValidObjectId } from "mongoose";

const createPlaylist = asyncHandler(async (req, res) => {
  // Check if data is coming through correctly
  console.log("Request body:", req.body);

  const { name, description } = req.body;

  // Validate input
  if (!name || !name.trim()) {
    throw new ApiError(400, "Playlist name is required");
  }

  if (!description || !description.trim()) {
    throw new ApiError(400, "Playlist description is required");
  }

  // Get videos (if any)
  let videos = [];
  if (req.body.videos) {
    try {
      // If videos is a string (JSON), parse it
      if (typeof req.body.videos === "string") {
        videos = JSON.parse(req.body.videos);
      } else {
        videos = req.body.videos;
      }
    } catch (error) {
      console.error("Error parsing videos:", error);
    }
  }

  // Create the playlist
  const playlist = await Playlist.create({
    name: name.trim(),
    description: description.trim(),
    videos: videos,
    owner: req.user._id,
  });

  if (!playlist) {
    throw new ApiError(500, "Failed to create playlist");
  }

  return res
    .status(201)
    .json(new ApiResponse(201, playlist, "Playlist created successfully"));
});
// getUserPlaylists function - Get all playlists of a user
const getUserPlaylists = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  // Validate user ID
  if (!userId || !isValidObjectId(userId)) {
    throw new ApiError(400, "Invalid user ID");
  }

  // Find all playlists for the user
  const playlists = await Playlist.find({ owner: userId })
    .populate("owner", "username fullname avatar")
    .sort("-createdAt");

  if (!playlists) {
    throw new ApiError(404, "No playlists found for this user");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, playlists, "User playlists fetched successfully")
    );
});

// getPlaylistById function - Get a specific playlist by ID
const getPlaylistById = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;

  // Validate playlist ID
  if (!playlistId || !isValidObjectId(playlistId)) {
    throw new ApiError(400, "Invalid playlist ID");
  }

  // Find the playlist and populate owner and videos
  const playlist = await Playlist.findById(playlistId)
    .populate("owner", "username fullname avatar")
    .populate({
      path: "videos",
      select: "title description thumbnail videoFile views duration owner",
      populate: {
        path: "owner",
        select: "username fullname avatar",
      },
    });

  if (!playlist) {
    throw new ApiError(404, "Playlist not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, playlist, "Playlist fetched successfully"));
});

// addVideoToPlaylist function - Add a video to a playlist
const addVideoToPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;

  // Validate IDs
  if (!playlistId || !isValidObjectId(playlistId)) {
    throw new ApiError(400, "Invalid playlist ID");
  }

  if (!videoId || !isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }

  // Find the playlist
  const playlist = await Playlist.findById(playlistId);

  if (!playlist) {
    throw new ApiError(404, "Playlist not found");
  }

  // Check if user is the owner
  if (playlist.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(
      403,
      "You don't have permission to modify this playlist"
    );
  }

  // Check if video exists
  const videoExists = await mongoose.model("Video").findById(videoId);

  if (!videoExists) {
    throw new ApiError(404, "Video not found");
  }

  // Check if video is already in the playlist
  if (playlist.videos.includes(videoId)) {
    throw new ApiError(400, "Video already exists in the playlist");
  }

  // Add video to playlist
  const updatedPlaylist = await Playlist.findByIdAndUpdate(
    playlistId,
    {
      $push: { videos: videoId },
    },
    { new: true }
  ).populate("owner", "username fullname avatar");

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        updatedPlaylist,
        "Video added to playlist successfully"
      )
    );
});

// removeVideoFromPlaylist function - Remove a video from a playlist
const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;

  // Validate IDs
  if (!playlistId || !isValidObjectId(playlistId)) {
    throw new ApiError(400, "Invalid playlist ID");
  }

  if (!videoId || !isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }

  // Find the playlist
  const playlist = await Playlist.findById(playlistId);

  if (!playlist) {
    throw new ApiError(404, "Playlist not found");
  }

  // Check if user is the owner
  if (playlist.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(
      403,
      "You don't have permission to modify this playlist"
    );
  }

  // Check if video is in the playlist
  if (!playlist.videos.includes(videoId)) {
    throw new ApiError(400, "Video does not exist in the playlist");
  }

  // Remove video from playlist
  const updatedPlaylist = await Playlist.findByIdAndUpdate(
    playlistId,
    {
      $pull: { videos: videoId },
    },
    { new: true }
  ).populate("owner", "username fullname avatar");

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        updatedPlaylist,
        "Video removed from playlist successfully"
      )
    );
});

// deletePlaylist function - Delete an entire playlist
const deletePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;

  // Validate playlist ID
  if (!playlistId || !isValidObjectId(playlistId)) {
    throw new ApiError(400, "Invalid playlist ID");
  }

  // Find the playlist
  const playlist = await Playlist.findById(playlistId);

  if (!playlist) {
    throw new ApiError(404, "Playlist not found");
  }

  // Check if user is the owner
  if (playlist.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(
      403,
      "You don't have permission to delete this playlist"
    );
  }

  // Delete the playlist
  await Playlist.findByIdAndDelete(playlistId);

  return res
    .status(200)
    .json(
      new ApiResponse(200, { deleted: true }, "Playlist deleted successfully")
    );
});

// updatePlaylist function - Update playlist details
const updatePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  const { name, description } = req.body;

  // Validate playlist ID
  if (!playlistId || !isValidObjectId(playlistId)) {
    throw new ApiError(400, "Invalid playlist ID");
  }

  // Ensure at least one field to update is provided
  if ((!name || !name.trim()) && (!description || !description.trim())) {
    throw new ApiError(
      400,
      "At least one field (name or description) is required for update"
    );
  }

  // Find the playlist
  const playlist = await Playlist.findById(playlistId);

  if (!playlist) {
    throw new ApiError(404, "Playlist not found");
  }

  // Check if user is the owner
  if (playlist.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(
      403,
      "You don't have permission to update this playlist"
    );
  }

  // Prepare update object
  const updateFields = {};

  if (name && name.trim()) {
    updateFields.name = name.trim();
  }

  if (description && description.trim()) {
    updateFields.description = description.trim();
  }

  // Update the playlist
  const updatedPlaylist = await Playlist.findByIdAndUpdate(
    playlistId,
    {
      $set: updateFields,
    },
    { new: true }
  ).populate("owner", "username fullname avatar");

  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedPlaylist, "Playlist updated successfully")
    );
});

export {
  createPlaylist,
  getUserPlaylists,
  getPlaylistById,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
  deletePlaylist,
  updatePlaylist,
};
