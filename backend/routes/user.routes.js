import { Router } from "express";
import {
  registerUser,
  logoutUser,
  loginUser,
  refreshAccesstoken,
  changeCurrentPassword,
  getCurrentUser,
  getUserChannelProfile,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getWatchHistory,
  forgotPassword,
  resetPassword,
} from "../controllers/users.controllers.js";
import { upload } from "../middlewares/multer.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js";

const router = Router();

// unsecured routes
// fields() allow multiple inputs
router.route("/register").post(
  upload.fields([
    {
      name: "avatar",
      maxCount: 1,
    },
    {
      name: "coverImage",
      maxCount: 1,
    },
  ]),
  registerUser
);

router.route("/login").post(loginUser);
router.route("/refresh-token").post(refreshAccesstoken);

//secured routes
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/change-password").post(verifyJWT, changeCurrentPassword);
router.route("/forgot-password").post(forgotPassword);
router.route("/reset-password/:token").post(resetPassword);
router.route("/current-user").get(verifyJWT, getCurrentUser);
router.route("/c/:username").get(verifyJWT, getUserChannelProfile);
router.route("/update-account").patch(verifyJWT, updateAccountDetails);
router
  .route("/avatar")
  .patch(verifyJWT, upload.single("avatar"), updateUserAvatar);
router
  .route("/cover-image")
  .patch(verifyJWT, upload.single("coverImage"), updateUserCoverImage);
router.route("/history").get(verifyJWT, getWatchHistory);

export default router;
