import jwt from "jsonwebtoken";
import { User } from "../models/user.models.js";

export const verifyJWT = (req, res, next) => {
  // Log for debugging
  console.log("Headers:", req.headers);
  console.log("Cookies:", req.cookies);

  // Get token from request
  let token = null;

  // Check Authorization header first
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  }

  // If no token in header, check cookies
  if (!token && req.cookies && req.cookies.accessToken) {
    token = req.cookies.accessToken;
  }

  console.log("Token found:", !!token);

  // If no token found, return unauthorized
  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized: Authentication required",
    });
  }

  // Verify the token
  try {
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    console.log("Token decoded:", decoded);

    // Check for user in database
    User.findById(decoded._id)
      .select("-password -refreshToken")
      .then((user) => {
        if (!user) {
          return res.status(401).json({
            success: false,
            message: "Unauthorized: User not found",
          });
        }

        // Set user in request object
        req.user = user;
        next();
      })
      .catch((err) => {
        console.error("Database error:", err);
        return res.status(500).json({
          success: false,
          message: "Internal server error",
        });
      });
  } catch (error) {
    console.error("Token verification error:", error);
    return res.status(401).json({
      success: false,
      message: "Unauthorized: Invalid token",
    });
  }
};