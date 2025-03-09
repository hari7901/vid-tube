// In your video routes file (e.g., video.routes.js)
import { Router } from "express";
import {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
} from "../controllers/video.controller.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js";
import { upload } from "../middlewares/multer.js";

const router = Router();

// Route for getting all videos with optional filtering
router.route("/").get(getAllVideos);

// Route for publishing a new video
router.route("/").post(
  verifyJWT,
  upload.fields([
    {
      name: "videoFile",
      maxCount: 1,
    },
    {
      name: "thumbnail",
      maxCount: 1,
    },
  ]),
  publishAVideo
);

router
  .route("/:videoId")
  .get(getVideoById)
  .patch(verifyJWT, upload.single("thumbnail"), updateVideo)
  .delete(verifyJWT, deleteVideo);

router.route("/toggle/:videoId").patch(verifyJWT, togglePublishStatus);


export default router;
