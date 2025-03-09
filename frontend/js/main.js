document.addEventListener("DOMContentLoaded", function () {
  console.log("Frontend initialized!");

  // Check if user is authenticated
  const token = localStorage.getItem("accessToken");
  if (!token && !window.location.pathname.includes("auth.html")) {
    // Redirect to login page if not authenticated
    window.location.href = "./pages/auth.html";
  }
});
