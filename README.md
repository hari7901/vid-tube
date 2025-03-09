# VideoHub - Video Sharing Platform

# 📋 Overview
VideoHub is a feature-rich video sharing platform that allows users to upload, share, and engage with video content. Built with modern web technologies, VideoHub offers a seamless user experience similar to popular platforms like YouTube.

# ✨ Features

# User Authentication

1. Secure registration and login
2. JWT-based authentication
3. Password strength validation


# Video Management

1. Upload videos with thumbnails
2. Video categorization
3. Toggle video publish status
4. Delete videos


# User Engagement

1. Like/unlike videos and comments
2. Subscribe to channels
3. Comment on videos
4. Create and manage playlists


# Dashboard & Analytics

1. View channel statistics
2. Track subscriber growth
3. Monitor video performance
4. Analyze user engagement

# User Profile

1. Customizable avatars and cover images
2. Watch history
3. Personalized content recommendations

# 🛠️ Tech Stack

# Frontend

1.HTML5, CSS3
2. Tailwind CSS for styling
3. JavaScript (ES6+)

# Backend

1. Node.js & Express.js
2. MongoDB with Mongoose ODM
3. JWT for authentication


# Media Storage

1. Cloudinary for video and image storage


# 📝 API Endpoints
The platform provides a comprehensive set of RESTful API endpoints:
Authentication

1. POST /api/v1/users/register - Register a new user
2. POST /api/v1/users/login - Authenticate a user
3. POST /api/v1/users/logout - Log out a user
4. POST /api/v1/users/refresh-token - Generate new access token


# Videos

1. GET /api/v1/videos - Get all videos
2. POST /api/v1/videos - Upload a new video
3. GET /api/v1/videos/:videoId - Get video by ID
4. PATCH /api/v1/videos/:videoId - Update video
5. DELETE /api/v1/videos/:videoId - Delete video
6. PATCH /api/v1/videos/toggle/:videoId - Toggle publish status

# Users & Channels

1. GET /api/v1/users/current-user - Get current user profile
2. GET /api/v1/users/c/:username - Get channel profile
3. GET /api/v1/users/history - Get watch history
4. PATCH /api/v1/users/update-account - Update user profile

# Comments

1. GET /api/v1/comments/v/:videoId - Get comments for a video
2. POST /api/v1/comments/v/:videoId - Add comment to a video
3. PATCH /api/v1/comments/:commentId - Update a comment
4. DELETE /api/v1/comments/:commentId - Delete a comment

# Subscriptions

1. POST /api/v1/subscriptions/c/:channelId - Subscribe/unsubscribe to channel
2. GET /api/v1/subscriptions/c/:channelId/subscribers - Get channel subscribers
3. GET /api/v1/subscriptions/me/channels - Get subscribed channels

# Dashboard

1. GET /api/v1/dashboard/stats - Get channel statistics
2. GET /api/v1/dashboard/videos - Get channel videos

# 💻 Project Structure

# videohub/
# ├── backend/             # API server code
1. ├── controllers/     # Route controllers
2. ├── middlewares/     # Express middlewares
3. ├── models/          # Mongoose models
4. ├── routes/          # API routes
5. └── utils/           # Utility functions
# ├── frontend/            # Frontend code
1. ├── assets/          # Static assets
2. ├── css/             # Stylesheets
3. ├── js/              # JavaScript files
4. └── pages/           # HTML pages
5. ├── .env                 # Environment variables
6. └── README.md            # Project documentation
