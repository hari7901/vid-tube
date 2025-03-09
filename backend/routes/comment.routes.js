import { Router } from "express";
import {
  getVideoComments,
  addComment,
  updateComment,
  deleteComment,
} from "../controllers/comment.controllers.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js";

const router = Router();

router.route("/v/:videoId").get(getVideoComments).post(verifyJWT, addComment);

// Update or delete a specific comment
router
  .route("/:commentId")
  .patch(verifyJWT, updateComment)
  .delete(verifyJWT, deleteComment);

export default router;
