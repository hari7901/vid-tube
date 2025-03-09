// dashboard.js

document.addEventListener("DOMContentLoaded", async () => {
  // On page load, check if user is authenticated
  const token = localStorage.getItem("accessToken");
  if (!token) {
    location.replace("./pages/auth.html");
    return;
  }
  // Fetch and display user info if stored in localStorage
  loadUserInfo();

  // Load channel stats
  await loadChannelStats();

  // Load channel videos
  await loadChannelVideos();

  // Initialize modal events
  initUploadModal();

  // Bind logout button
  const logoutButton = document.getElementById("logout-button");
  if (logoutButton) {
    logoutButton.addEventListener("click", handleLogout);
  }
});

async function handleLogout() {
  const proceed = confirm("Are you sure you want to log out?");
  if (!proceed) return; // User canceled

  showLoading(true);
  try {
    // Make a request to your logout route
    await fetch(`${window.API_BASE_URL}/users/logout`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
      },
      // The server should clear the refreshToken + cookies
    });
  } catch (error) {
    console.error("Logout error:", error);
  } finally {
    // Clear local storage
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");

    showLoading(false);
    // Use location.replace so user can't go back
    location.replace("./pages/auth.html");
  }
}
// ======================= LOAD CHANNEL STATS =======================
async function loadChannelStats() {
  try {
    showLoading(true);
    const res = await fetch(`${window.API_BASE_URL}/dashboard/stats`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
      },
    });
    const { data, message } = await res.json();

    if (res.ok) {
      // Update UI
      document.getElementById("total-subscribers").textContent =
        data.totalSubscribers;
      document.getElementById("total-videos").textContent = data.totalVideos;
      document.getElementById("total-views").textContent = data.totalViews;
      document.getElementById("total-likes").textContent = data.totalLikes;

      // Videos by month
      const monthList = document.getElementById("month-distribution-list");
      monthList.innerHTML = "";
      data.videosByMonth.forEach((item) => {
        // item._id.month, item._id.year, item.count
        const li = document.createElement("li");
        li.textContent = `${monthName(item._id.month)} ${item._id.year}: ${
          item.count
        } videos`;
        monthList.appendChild(li);
      });

      // Top videos
      const topVideosContainer = document.getElementById("top-videos-list");
      topVideosContainer.innerHTML = "";
      data.topVideos.forEach((video) => {
        // Create a card for each top video
        const card = document.createElement("div");
        card.className = "border rounded p-2 flex flex-col";

        const img = document.createElement("img");
        img.src = video.thumbnail;
        img.alt = video.title;
        img.className = "rounded mb-2 object-cover";

        const title = document.createElement("h3");
        title.className = "font-semibold text-sm text-gray-800 mb-1";
        title.textContent = video.title;

        const views = document.createElement("p");
        views.className = "text-xs text-gray-500";
        views.textContent = `${video.views} views`;

        card.appendChild(img);
        card.appendChild(title);
        card.appendChild(views);

        topVideosContainer.appendChild(card);
      });
    } else {
      showNotification(message || "Failed to load stats", "error");
    }
  } catch (error) {
    console.error("Error loading channel stats:", error);
    showNotification(error.message || "Error loading stats", "error");
  } finally {
    showLoading(false);
  }
}

function monthName(month) {
  // Convert 1-based month to a name; adjust as needed
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  return monthNames[month - 1] || "Unknown";
}

// ======================= LOAD CHANNEL VIDEOS =======================
let currentPage = 1;
const limit = 5; // or whatever you want
async function loadChannelVideos(page = 1) {
  try {
    showLoading(true);
    const res = await fetch(
      `${window.API_BASE_URL}/dashboard/videos?page=${page}&limit=${limit}`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
      }
    );
    const { data, message } = await res.json();

    if (res.ok) {
      // Populate table
      const tableBody = document.getElementById("channel-videos-table");
      tableBody.innerHTML = "";
      data.videos.forEach((video) => {
        const row = document.createElement("tr");

        // Title
        const tdTitle = document.createElement("td");
        tdTitle.className = "px-4 py-2";
        tdTitle.textContent = video.title;
        row.appendChild(tdTitle);

        // Views
        const tdViews = document.createElement("td");
        tdViews.className = "px-4 py-2";
        tdViews.textContent = video.views;
        row.appendChild(tdViews);

        // isPublished
        const tdPublished = document.createElement("td");
        tdPublished.className = "px-4 py-2";
        tdPublished.textContent = video.isPublished ? "Yes" : "No";
        row.appendChild(tdPublished);

        // CreatedAt
        const tdCreated = document.createElement("td");
        tdCreated.className = "px-4 py-2";
        tdCreated.textContent = new Date(video.createdAt).toLocaleString();
        row.appendChild(tdCreated);

        tableBody.appendChild(row);
      });

      // Pagination
      currentPage = data.pagination.page;
      document.getElementById("page-info").textContent = `Page ${currentPage}`;
      const prevBtn = document.getElementById("prev-page");
      const nextBtn = document.getElementById("next-page");

      // Enable/disable as appropriate
      prevBtn.disabled = !data.pagination.hasPrevPage;
      nextBtn.disabled = !data.pagination.hasNextPage;

      // Bind events
      prevBtn.onclick = () => {
        if (data.pagination.hasPrevPage) {
          loadChannelVideos(currentPage - 1);
        }
      };
      nextBtn.onclick = () => {
        if (data.pagination.hasNextPage) {
          loadChannelVideos(currentPage + 1);
        }
      };
    } else {
      showNotification(message || "Failed to load videos", "error");
    }
  } catch (error) {
    console.error("Error loading channel videos:", error);
    showNotification(error.message || "Error loading videos", "error");
  } finally {
    showLoading(false);
  }
}

// ======================= UPLOAD MODAL AND FORM =======================
function initUploadModal() {
  const uploadButton = document.getElementById("upload-video-button");
  const uploadModal = document.getElementById("uploadVideoModal");
  const closeUploadModalBtn = document.getElementById("closeUploadModalBtn");
  const uploadVideoForm = document.getElementById("uploadVideoForm");

  if (!uploadModal || !uploadButton || !uploadVideoForm) return;

  // Show modal
  uploadButton.addEventListener("click", () => {
    uploadModal.classList.remove("hidden");
  });

  // Hide modal on close button
  closeUploadModalBtn.addEventListener("click", () => {
    uploadModal.classList.add("hidden");
  });

  // Hide if user clicks outside the modal
  window.addEventListener("click", (e) => {
    if (e.target === uploadModal) {
      uploadModal.classList.add("hidden");
    }
  });

  // Handle form submission
  uploadVideoForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    showLoading(true);

    try {
      const title = document.getElementById("videoTitle").value.trim();
      const description = document
        .getElementById("videoDescription")
        .value.trim();
      const thumbnailFile = document.getElementById("thumbnailFile").files[0];
      const videoFile = document.getElementById("videoFile").files[0];
      const isPublished = document.getElementById("publishToggle").checked;

      // Validate
      if (!title || !description || !thumbnailFile || !videoFile) {
        showNotification("Please fill all fields and select files", "error");
        showLoading(false);
        return;
      }

      const formData = new FormData();
      formData.append("title", title);
      formData.append("description", description);
      formData.append("thumbnail", thumbnailFile);
      formData.append("videoFile", videoFile);
      formData.append("isPublished", isPublished ? "true" : "false");

      const response = await fetch(`${window.API_BASE_URL}/videos`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          // Note: Do NOT manually set "Content-Type" when sending FormData
        },
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        showNotification("Video uploaded successfully!", "success");

        // Hide the modal and reset the form
        uploadModal.classList.add("hidden");
        uploadVideoForm.reset();

        // Reload channel videos to see the newly uploaded one
        loadChannelVideos();
      } else {
        console.error("Upload error:", data);
        showNotification(data.message || "Upload failed", "error");
      }
    } catch (error) {
      console.error("Video upload error:", error);
      showNotification(error.message || "Upload failed", "error");
    } finally {
      showLoading(false);
    }
  });
}

// ======================= UTILITY FUNCTIONS =======================
function loadUserInfo() {
  const userStr = localStorage.getItem("user");
  if (!userStr) return;

  const user = JSON.parse(userStr);
  const userAvatar = document.getElementById("user-avatar");
  const userName = document.getElementById("user-name");
  const userEmail = document.getElementById("user-email");

  if (userAvatar)
    userAvatar.src = user.avatar || "https://via.placeholder.com/150";
  if (userName) userName.textContent = user.fullname || user.username || "User";
  if (userEmail) userEmail.textContent = user.email || "user@example.com";
}

// Example showLoading function (matches your loading overlay)
function showLoading(show) {
  const loadingOverlay = document.getElementById("loading-overlay");
  if (!loadingOverlay) return;
  if (show) {
    loadingOverlay.classList.remove("hidden");
  } else {
    loadingOverlay.classList.add("hidden");
  }
}

// Example showNotification function
function showNotification(message, type = "info") {
  // Remove existing notifications if you want only one at a time,
  // or create a container and append multiple. For brevity:
  alert(`${type.toUpperCase()}: ${message}`);
}
