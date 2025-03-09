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

POST /api/v1/users/register - Register a new user
POST /api/v1/users/login - Authenticate a user
POST /api/v1/users/logout - Log out a user
POST /api/v1/users/refresh-token - Generate new access token


# Videos

GET /api/v1/videos - Get all videos
POST /api/v1/videos - Upload a new video
GET /api/v1/videos/:videoId - Get video by ID
PATCH /api/v1/videos/:videoId - Update video
DELETE /api/v1/videos/:videoId - Delete video
PATCH /api/v1/videos/toggle/:videoId - Toggle publish status

# Users & Channels

GET /api/v1/users/current-user - Get current user profile
GET /api/v1/users/c/:username - Get channel profile
GET /api/v1/users/history - Get watch history
PATCH /api/v1/users/update-account - Update user profile

# Comments

GET /api/v1/comments/v/:videoId - Get comments for a video
POST /api/v1/comments/v/:videoId - Add comment to a video
PATCH /api/v1/comments/:commentId - Update a comment
DELETE /api/v1/comments/:commentId - Delete a comment

# Subscriptions

POST /api/v1/subscriptions/c/:channelId - Subscribe/unsubscribe to channel
GET /api/v1/subscriptions/c/:channelId/subscribers - Get channel subscribers
GET /api/v1/subscriptions/me/channels - Get subscribed channels

# Dashboard

GET /api/v1/dashboard/stats - Get channel statistics
GET /api/v1/dashboard/videos - Get channel videos

# 💻 Project Structure

videohub/
├── backend/             # API server code
│   ├── controllers/     # Route controllers
│   ├── middlewares/     # Express middlewares
│   ├── models/          # Mongoose models
│   ├── routes/          # API routes
│   └── utils/           # Utility functions
├── frontend/            # Frontend code
│   ├── assets/          # Static assets
│   ├── css/             # Stylesheets
│   ├── js/              # JavaScript files
│   └── pages/           # HTML pages
├── .env                 # Environment variables
└── README.md            # Project documentation
