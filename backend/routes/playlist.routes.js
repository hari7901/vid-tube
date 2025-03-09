import { Router } from "express";
import {
  createPlaylist,
  getUserPlaylists,
  getPlaylistById,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
  deletePlaylist,
  updatePlaylist,
} from "../controllers/playlist.controllers.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js";

const router = Router();

// Create playlist
router.route("/").post(verifyJWT, createPlaylist);

// Get user playlists
router.route("/user/:userId").get(getUserPlaylists);

// Get, update, and delete specific playlist
router
  .route("/:playlistId")
  .get(getPlaylistById)
  .patch(verifyJWT, updatePlaylist)
  .delete(verifyJWT, deletePlaylist);

// Add video to playlist
router
  .route("/:playlistId/videos/:videoId")
  .post(verifyJWT, addVideoToPlaylist);

// Remove video from playlist
router
  .route("/:playlistId/videos/:videoId")
  .delete(verifyJWT, removeVideoFromPlaylist);

export default router;
