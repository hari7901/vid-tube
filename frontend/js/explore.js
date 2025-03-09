// explore.js

document.addEventListener("DOMContentLoaded", () => {
  // Check if user has an access token
  const token = localStorage.getItem("accessToken");
  if (!token) {
    location.replace("../pages/auth.html");
    return;
  }

  // Load videos
  loadExploreVideos();

  // Setup logout modal
  setupLogoutModal();

  // Setup custom notification close
  const notificationClose = document.getElementById("notificationClose");
  if (notificationClose) {
    notificationClose.addEventListener("click", hideCustomNotification);
  }
});

// Pagination state
let currentExplorePage = 1;
const exploreLimit = 8;

async function loadExploreVideos(page = 1) {
  showLoading(true);
  try {
    const res = await fetch(
      `${window.API_BASE_URL}/videos?page=${page}&limit=${exploreLimit}`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
      }
    );
    const json = await res.json();

    if (!res.ok) {
      showCustomNotification("Error", json.message || "Failed to load videos");
      return;
    }

    const data = json.data; // { videos, pagination, ... }

    // If no videos
    const grid = document.getElementById("explore-video-grid");
    grid.innerHTML = "";

    if (!data.videos || data.videos.length === 0) {
      // Show "No videos found" message
      const msg = document.createElement("p");
      msg.className = "col-span-full text-center text-gray-500 text-sm";
      msg.textContent = "No videos have been uploaded yet.";
      grid.appendChild(msg);
      // Hide pagination
      document.getElementById("explore-pagination").style.display = "none";
      return;
    }

    document.getElementById("explore-pagination").style.display = "flex";

    // Populate grid
    data.videos.forEach((video) => {
      // Create card
      const card = document.createElement("div");
      card.className =
        "bg-white rounded shadow-sm cursor-pointer hover:shadow-md transition p-2";

      // Thumbnail
      const thumb = document.createElement("img");
      thumb.src = video.thumbnail;
      thumb.alt = video.title;
      thumb.className = "w-full h-40 object-cover rounded";
      card.appendChild(thumb);

      // Title
      const title = document.createElement("h3");
      title.className = "text-sm font-semibold mt-2 text-gray-800 line-clamp-2";
      title.textContent = video.title;
      card.appendChild(title);

      // Channel name
      const channel = document.createElement("p");
      channel.className = "text-xs text-gray-500";
      channel.textContent = video.owner?.fullname || "Unknown";
      card.appendChild(channel);

      // Views
      const views = document.createElement("p");
      views.className = "text-xs text-gray-500";
      views.textContent = `${video.views} views`;
      card.appendChild(views);

      // On click => watch page
      card.addEventListener("click", () => {
        window.location.href = `./watch.html?videoId=${video._id}`;
      });

      grid.appendChild(card);
    });

    // Pagination
    currentExplorePage = data.pagination.page;
    document.getElementById(
      "explore-page-info"
    ).textContent = `Page ${currentExplorePage}`;

    const prevBtn = document.getElementById("explore-prev-page");
    const nextBtn = document.getElementById("explore-next-page");

    prevBtn.disabled = !data.pagination.hasPrevPage;
    nextBtn.disabled = !data.pagination.hasNextPage;

    prevBtn.onclick = () => {
      if (data.pagination.hasPrevPage) {
        loadExploreVideos(currentExplorePage - 1);
      }
    };
    nextBtn.onclick = () => {
      if (data.pagination.hasNextPage) {
        loadExploreVideos(currentExplorePage + 1);
      }
    };
  } catch (err) {
    console.error("Explore error:", err);
    showCustomNotification("Error", err.message || "Error loading videos");
  } finally {
    showLoading(false);
  }
}

function setupLogoutModal() {
  const logoutButton = document.getElementById("explore-logout-button");
  const logoutModal = document.getElementById("logoutModal");
  const logoutModalClose = document.getElementById("logoutModalClose");
  const cancelLogoutBtn = document.getElementById("cancelLogoutBtn");
  const confirmLogoutBtn = document.getElementById("confirmLogoutBtn");

  if (!logoutButton || !logoutModal) return;

  // Show the logout modal on click
  logoutButton.addEventListener("click", () => {
    logoutModal.classList.remove("hidden");
    logoutModal.classList.add("flex");
  });

  // Hide modal function
  const hideLogoutModal = () => {
    logoutModal.classList.add("hidden");
    logoutModal.classList.remove("flex");
  };

  logoutModalClose.addEventListener("click", hideLogoutModal);
  cancelLogoutBtn.addEventListener("click", hideLogoutModal);
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
  } catch (err) {
    console.error("Logout error:", err);
  } finally {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    showLoading(false);
    location.replace("../pages/auth.html");
  }
}

/* Custom in-app notifications (no server or browser prompts) */
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

function showLoading(show) {
  const overlay = document.getElementById("loading-overlay");
  if (!overlay) return;
  overlay.classList.toggle("hidden", !show);
}
