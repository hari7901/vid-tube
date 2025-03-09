// watch.js

document.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem("accessToken");
  if (!token) {
    location.replace("../pages/auth.html");
    return;
  }

  setupLogoutModal();

  // Setup custom notification close
  const notificationClose = document.getElementById("notificationClose");
  if (notificationClose) {
    notificationClose.addEventListener("click", hideCustomNotification);
  }

  // Parse videoId
  const params = new URLSearchParams(window.location.search);
  const videoId = params.get("videoId");
  if (!videoId) {
    // Show a message that no video was selected
    showCustomNotification("Info", "No video was specified.");
    // Optionally redirect or hide content
    return;
  }

  // Load video info
  await loadVideo(videoId);

  // Load comments
  await loadComments(videoId);
});

/**
 * Load main video from /videos/:videoId
 * Populate the page (title, views, owner info, etc.).
 */
async function loadVideo(videoId) {
  showLoading(true);
  try {
    const res = await fetch(`${window.API_BASE_URL}/videos/${videoId}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
      },
    });
    const json = await res.json();
    if (!res.ok) {
      showCustomNotification("Error", json.message || "Failed to load video");
      return;
    }

    const video = json.data;

    // If no such video
    if (!video) {
      showCustomNotification("Info", "This video does not exist.");
      return;
    }

    document.getElementById("video-player").src = video.videoFile;
    document.getElementById("video-player").poster = video.thumbnail;
    document.getElementById("video-title").textContent = video.title;
    document.getElementById("video-views").textContent = `${video.views} views`;
    document.getElementById("like-count").textContent = video.likeCount || 0;

    document.getElementById("owner-avatar").src =
      video.owner?.avatar || "https://via.placeholder.com/50";
    document.getElementById("owner-name").textContent =
      video.owner?.fullname || "Unknown Channel";
    document.getElementById("owner-username").textContent =
      "@" + (video.owner?.username || "unknown");
    document.getElementById("video-description").textContent =
      video.description;

    // Like button
    const likeBtn = document.getElementById("like-button");
    likeBtn.onclick = () => toggleLike(video._id);
  } catch (err) {
    console.error("Load video error:", err);
    showCustomNotification("Error", err.message || "Error loading video");
  } finally {
    showLoading(false);
  }
}

/**
 * Toggle like for the main video
 */
async function toggleLike(videoId) {
  showLoading(true);
  try {
    const res = await fetch(
      `${window.API_BASE_URL}/likes/toggle/videos/${videoId}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
      }
    );
    const json = await res.json();
    if (res.ok) {
      const likeCountEl = document.getElementById("like-count");
      let count = parseInt(likeCountEl.textContent) || 0;
      if (json.data.liked) {
        showCustomNotification("Success", "You liked this video!");
        likeCountEl.textContent = count + 1;
      } else {
        showCustomNotification("Info", "You unliked this video.");
        likeCountEl.textContent = count > 0 ? count - 1 : 0;
      }
    } else {
      showCustomNotification(
        "Error",
        json.message || "Failed to toggle like action"
      );
    }
  } catch (err) {
    console.error("Like error:", err);
    showCustomNotification("Error", err.message || "Error toggling like");
  } finally {
    showLoading(false);
  }
}

/**
 * Load comments from /comments/v/:videoId, then populate the comment list.
 * Also handle the add comment form submission.
 */
async function loadComments(videoId) {
  showLoading(true);
  try {
    const res = await fetch(`${window.API_BASE_URL}/comments/v/${videoId}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
      },
    });
    const json = await res.json();
    if (!res.ok) {
      showCustomNotification(
        "Error",
        json.message || "Failed to load comments"
      );
      return;
    }

    const commentData = json.data;
    const listEl = document.getElementById("comment-list");
    listEl.innerHTML = "";

    const comments = commentData.comments || [];
    if (comments.length === 0) {
      // Show a "no comments" message
      const msg = document.createElement("p");
      msg.className = "text-gray-500 text-sm";
      msg.textContent = "No comments yet. Be the first to comment!";
      listEl.appendChild(msg);
    } else {
      comments.forEach((cmt) => {
        const div = document.createElement("div");
        div.className = "p-2 bg-gray-100 rounded shadow-sm";

        const row = document.createElement("div");
        row.className = "flex items-center space-x-2 mb-1";
        const avatar = document.createElement("img");
        avatar.className = "w-6 h-6 rounded-full";
        avatar.src = cmt.owner?.avatar || "https://via.placeholder.com/40";
        row.appendChild(avatar);

        const name = document.createElement("span");
        name.className = "text-sm font-medium text-gray-700";
        name.textContent = cmt.owner?.fullname || "Unknown user";
        row.appendChild(name);

        div.appendChild(row);

        const contentP = document.createElement("p");
        contentP.className = "text-sm text-gray-600";
        contentP.textContent = cmt.content;
        div.appendChild(contentP);

        const dateP = document.createElement("p");
        dateP.className = "text-xs text-gray-400 mt-1";
        dateP.textContent = new Date(cmt.createdAt).toLocaleString();
        div.appendChild(dateP);

        listEl.appendChild(div);
      });
    }

    // Setup comment form
    const commentForm = document.getElementById("add-comment-form");
    commentForm.onsubmit = async (e) => {
      e.preventDefault();
      const contentInput = document.getElementById("comment-content");
      const content = contentInput.value.trim();
      if (!content) return;

      try {
        showLoading(true);
        const postRes = await fetch(
          `${window.API_BASE_URL}/comments/v/${videoId}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
            },
            body: JSON.stringify({ content }),
          }
        );
        const postData = await postRes.json();
        if (postRes.ok) {
          contentInput.value = "";
          // Reload comments
          await loadComments(videoId);
        } else {
          showCustomNotification(
            "Error",
            postData.message || "Failed to add comment"
          );
        }
      } catch (err) {
        console.error("Add comment error:", err);
        showCustomNotification("Error", err.message || "Comment error");
      } finally {
        showLoading(false);
      }
    };
  } catch (err) {
    console.error("Load comments error:", err);
    showCustomNotification("Error", err.message || "Failed to load comments");
  } finally {
    showLoading(false);
  }
}

/* LOGOUT MODAL & LOGIC */
function setupLogoutModal() {
  const logoutButton = document.getElementById("watch-logout-button");
  const logoutModal = document.getElementById("logoutModal");
  const logoutModalClose = document.getElementById("logoutModalClose");
  const cancelLogoutBtn = document.getElementById("cancelLogoutBtn");
  const confirmLogoutBtn = document.getElementById("confirmLogoutBtn");

  if (!logoutButton || !logoutModal) return;

  logoutButton.addEventListener("click", () => {
    logoutModal.classList.remove("hidden");
    logoutModal.classList.add("flex");
  });

  const hideModal = () => {
    logoutModal.classList.add("hidden");
    logoutModal.classList.remove("flex");
  };

  logoutModalClose.addEventListener("click", hideModal);
  cancelLogoutBtn.addEventListener("click", hideModal);

  confirmLogoutBtn.addEventListener("click", handleLogout);
}

async function handleLogout() {
  showLoading(true);
  try {
    await fetch(`${window.API_BASE_URL}/users/logout`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
      },
    });
  } catch (error) {
    console.error("Logout error:", error);
  } finally {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    showLoading(false);
    location.replace("../pages/auth.html");
  }
}

/* CUSTOM NOTIFICATION (no native prompts) */
function showCustomNotification(title, message) {
  const notif = document.getElementById("customNotification");
  const notifTitle = document.getElementById("notificationTitle");
  const notifMessage = document.getElementById("notificationMessage");

  notifTitle.textContent = title;
  notifMessage.textContent = message;

  // Show it
  notif.classList.remove("hidden");
}

function hideCustomNotification() {
  const notif = document.getElementById("customNotification");
  notif.classList.add("hidden");
}

/* LOADING OVERLAY */
function showLoading(show) {
  const overlay = document.getElementById("loading-overlay");
  if (!overlay) return;
  overlay.classList.toggle("hidden", !show);
}
