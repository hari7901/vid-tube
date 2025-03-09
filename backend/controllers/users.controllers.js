import crypto from "crypto";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.models.js";
import {
  deleteFromCloudinary,
  uploadOnCloudinary,
} from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { Subscription } from "../models/subscription.models.js";

const generateAccessRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, "User not found");
    }
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;

    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went weong while generating access and refresh tokens"
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  const { fullname, email, username, password } = req.body;

  // validation, the syntax inside field will apply to everything now
  if (
    [fullname, username, email, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }
  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existedUser) {
    throw new ApiError(409, "User with email or username already exists");
  }

  console.warn(req.files);
  const avatarLocalPath = req.files?.avatar?.[0]?.path;
  const coverLocalPath = req.files?.coverImage?.[0]?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is missing");
  }
  //   const avatar = await uploadOnCloudinary(avatarLocalPath);
  //   let coverImage = "";
  //   if (coverLocalPath) {
  //     coverImage = await uploadOnCloudinary(coverLocalPath);
  //   }

  let avatar;
  try {
    avatar = await uploadOnCloudinary(avatarLocalPath);
    console.log("Uploaded avatar", avatar);

    if (!avatar) {
      throw new Error("Failed to upload avatar to Cloudinary");
    }
  } catch (err) {
    console.log("Error uploading avatar", err);
    throw new ApiError(500, "Failed to upload avatar to Cloudinary");
  }

  let coverImage = null;
  if (coverLocalPath) {
    try {
      coverImage = await uploadOnCloudinary(coverLocalPath);
      console.log("Uploaded cover image", coverImage);
    } catch (err) {
      console.log("Error uploading cover image", err);
      // Don't throw error for cover image, it's optional
    }
  }

  try {
    const user = await User.create({
      fullname,
      avatar: avatar?.url,
      coverImage: coverImage?.url || "",
      email,
      password,
      username: username.toLowerCase(),
    });
    const createdUser = await User.findById(user._id).select(
      "-password -refreshToken"
    );

    if (!createdUser) {
      throw new ApiError(500, "Something went wrong while registering");
    }

    return res
      .status(201)
      .json(new ApiResponse(200, createdUser, "User registered successfully"));
  } catch (error) {
    console.log("User creation failed");
    if (avatar) {
      await deleteFromCloudinary(avatar.public_id);
    }
    if (coverImage) {
      await deleteFromCloudinary(avatar.public_id);
    }
    throw new ApiError(
      500,
      "Something went wrong while registering a user and images were deleted"
    );
  }
});

const loginUser = asyncHandler(async (req, res) => {
  // get data from body
  const { email, username, password } = req.body;

  if (!email) {
    throw new ApiError(400, "Email is required");
  }
  if (!password) {
    throw new ApiError(400, "Password is required");
  }
  const user = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // validate password
  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid credentials");
  }

  const { accessToken, refreshToken } = await generateAccessRefreshToken(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!loggedInUser) {
    throw new ApiError(401, "User not logged in");
  }

  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        { user: loggedInUser, accessToken, refreshToken },
        loggedInUser,
        "User logged in successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    { new: true }
  );
  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out successfully"));
});

// when refresh token has expied and 401 has been sent ot the uswr, produce a new route for him to re generate the access token
const refreshAccesstoken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Refresh token is required");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken?._id);
    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }
    if (user?.refreshToken !== incomingRefreshToken) {
      throw new ApiError(401, "Refresh token is expired or used");
    }

    const options = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    };

    const { accessToken, refreshToken: newRefreshToken } =
      await generateAccessRefreshToken(user._id);

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options) // Fixed typo "cokie"
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Access Token refreshed successfully" // Fixed typo
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
});
const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  const user = await User.findById(req.user?._id);

  const isPasswordValid = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordValid) {
    throw new ApiError(401, "Old password is incoreect");
  }

  user.password = newPassword;

  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password is changes successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "Current user details"));
});

const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) {
    throw new ApiError(400, "Email is required");
  }

  const user = await User.findOne({ email });
  if (!user) {
    throw new ApiError(404, "No user found with that email");
  }

  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  const resetURL = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;
  try {
    await sendResetEmail({
      to: user.email,
      subject: "Your password reset token (valid for 15 min)",
      resetURL,
    });
    return res
      .status(200)
      .json(new ApiResponse(200, { sent: true }, "Reset token sent to email"));
  } catch (err) {}
});


const resetPassword = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  if (!token || !password) {
    throw new ApiError(400, "Token and password are required");
  }

  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  const user = User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!user) {
    throw new ApiError(400, "Token is invalid or has expired");
  }

  user.password = password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;

  await user.save();
  return res
    .status(200)
    .json(new ApiResponse(200, { reset: true }, "Password has been reset"));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullname, email } = req.body;

  if (!fullname || !email) {
    throw new ApiError(400, "Fullname and email are required");
  }

  const updatedUser = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullname,
        email,
      },
    },
    { new: true }
  ).select("-password -refreshToken");

  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedUser, "Account details updated successfully")
    );
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "File is required");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);

  if (!avatar.url) {
    throw new ApiError(500, "Something went wrong while uploading avatar");
  }

  const updatedUser = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    { new: true }
  ).select("-password -refreshToken");

  return res
    .status(200)
    .json(new ApiResponse(200, updatedUser, "Avatar updated successfully"));
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path;

  if (!coverImageLocalPath) {
    throw new ApiError(400, "File is required");
  }

  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!coverImage.url) {
    throw new ApiError(500, "Something went wrong while uploading cover image");
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        coverImage: coverImage.url,
      },
    },
    { new: true }
  ).select("-password -refreshToken");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Cover Image uploaded successfully"));
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;

  if (!username) {
    throw new ApiError(400, "Username is required");
  }

  const channel = await User.findOne({
    username: username?.toLowerCase(),
  });

  if (!channel) {
    throw new ApiError(404, "Channel not found");
  }

  // Find subscribers count
  const subscribersCount = await Subscription.countDocuments({
    channel: channel._id,
  });

  // Find channels subscribed to count
  const channelsSubscribedToCount = await Subscription.countDocuments({
    subscriber: channel._id,
  });

  // Check if the requesting user is subscribed to this channel
  const isSubscribed = req.user
    ? await Subscription.exists({
        channel: channel._id,
        subscriber: req.user._id,
      })
    : false;

  const channelProfile = {
    _id: channel._id,
    fullname: channel.fullname,
    username: channel.username,
    avatar: channel.avatar,
    coverImage: channel.coverImage,
    email: channel.email,
    subscribersCount,
    channelsSubscribedToCount,
    isSubscribed: Boolean(isSubscribed),
  };

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        channelProfile,
        "Channel profile fetched successfully"
      )
    );
});

const getWatchHistory = asyncHandler(async (req, res) => {
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user?._id),
      },
    },
    {
      $lookup: {
        from: "videos", // Assuming your collection is named "videos" (lowercase)
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $lookup: {
              from: "users", // Assuming your collection is named "users" (lowercase)
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    fullname: 1,
                    username: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: {
                $first: "$owner",
              },
            },
          },
        ],
      },
    },
  ]);

  if (!user || user.length === 0) {
    throw new ApiError(404, "User watch history not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, user[0], "Watch history fetched successfully"));
});

export {
  registerUser,
  loginUser,
  refreshAccesstoken,
  logoutUser,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile,
  getWatchHistory,
  forgotPassword,
  resetPassword
};
