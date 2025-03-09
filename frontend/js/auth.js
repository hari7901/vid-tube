document.addEventListener("DOMContentLoaded", function () {
  console.log("Auth.js file loaded successfully!");

  // Check if user is already logged in
  const token = localStorage.getItem("accessToken");
  if (token) {
    // Redirect to dashboard if already logged in
    window.location.href = "../index.html";
    return;
  }

  // Form switching
  const loginForm = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");
  const switchToRegister = document.getElementById("switch-to-register");
  const switchToLogin = document.getElementById("switch-to-login");

  if (switchToRegister) {
    switchToRegister.addEventListener("click", function (e) {
      e.preventDefault();
      loginForm.classList.add("hidden");
      registerForm.classList.remove("hidden");
    });
  }

  if (switchToLogin) {
    switchToLogin.addEventListener("click", function (e) {
      e.preventDefault();
      registerForm.classList.add("hidden");
      loginForm.classList.remove("hidden");
    });
  }

  // Password visibility toggle
  const togglePasswordButtons = document.querySelectorAll(".toggle-password");

  togglePasswordButtons.forEach((button) => {
    button.addEventListener("click", function () {
      // Find the closest input field
      const passwordInput = this.closest("div.relative").querySelector("input");

      // Toggle password visibility
      const type =
        passwordInput.getAttribute("type") === "password" ? "text" : "password";
      passwordInput.setAttribute("type", type);

      // Toggle eye icon
      this.classList.toggle("fa-eye");
      this.classList.toggle("fa-eye-slash");
    });
  });

  // Password strength meter
  const passwordInput = document.getElementById("password");
  const strengthSegments = document.querySelectorAll(".strength-segment");
  const strengthText = document.querySelector(".strength-text");

  if (passwordInput) {
    passwordInput.addEventListener("input", function () {
      const password = this.value;
      let strength = 0;

      // Check password length
      if (password.length >= 8) {
        strength += 1;
      }

      // Check for lowercase and uppercase letters
      if (password.match(/[a-z]/) && password.match(/[A-Z]/)) {
        strength += 1;
      }

      // Check for numbers
      if (password.match(/[0-9]/)) {
        strength += 1;
      }

      // Check for special characters
      if (password.match(/[^a-zA-Z0-9]/)) {
        strength += 1;
      }

      // Reset all segments
      strengthSegments.forEach((segment) => {
        segment.className = "strength-segment h-1 w-1/4 bg-gray-200 rounded";
      });

      // Update strength meter
      for (let i = 0; i < strength; i++) {
        if (strength === 1) {
          strengthSegments[i].className =
            "strength-segment h-1 w-1/4 bg-red-500 rounded";
        } else if (strength === 2) {
          strengthSegments[i].className =
            "strength-segment h-1 w-1/4 bg-yellow-500 rounded";
        } else if (strength === 3) {
          strengthSegments[i].className =
            "strength-segment h-1 w-1/4 bg-blue-500 rounded";
        } else {
          strengthSegments[i].className =
            "strength-segment h-1 w-1/4 bg-green-500 rounded";
        }
      }

      // Update strength text
      const strengthLabels = ["Weak", "Fair", "Good", "Strong"];
      if (password.length === 0) {
        strengthText.textContent = "Password strength";
      } else {
        strengthText.textContent = strengthLabels[strength - 1] || "Too weak";
      }
    });
  }

  // File input preview
  const fileInputs = document.querySelectorAll('input[type="file"]');

  fileInputs.forEach((input) => {
    input.addEventListener("change", function (e) {
      const preview = this.nextElementSibling;

      if (this.files && this.files[0]) {
        const reader = new FileReader();

        reader.onload = function (e) {
          // Create image preview
          const img = document.createElement("img");
          img.src = e.target.result;
          img.className =
            input.id === "avatar"
              ? "w-16 h-16 rounded-full object-cover mx-auto mb-2"
              : "w-16 h-16 rounded object-cover mx-auto mb-2";

          // Create filename span
          const fileName = document.createElement("span");
          fileName.className = "text-xs text-gray-500";
          fileName.textContent =
            input.files[0].name.length > 15
              ? input.files[0].name.substring(0, 15) + "..."
              : input.files[0].name;

          // Replace preview content
          preview.innerHTML = "";
          preview.appendChild(img);
          preview.appendChild(fileName);
        };

        reader.readAsDataURL(this.files[0]);
      }
    });
  });

  // Form submission for login
  if (loginForm) {
    loginForm.addEventListener("submit", async function (e) {
      e.preventDefault();

      const email = document.getElementById("login-email").value;
      const password = document.getElementById("login-password").value;

      try {
        showLoading(true);

        // Debug info
        console.log("Attempting login with:", { email });
        console.log("API URL:", `${window.API_BASE_URL}/users/login`);

        const loginData = {
          email: email,
          password: password,
        };

        console.log("Login payload:", loginData);

        const response = await fetch(`${window.API_BASE_URL}/users/login`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(loginData),
          credentials: "include",
        });

        // Debug response status
        console.log("Login response status:", response.status);
        console.log(
          "Response headers:",
          Object.fromEntries([...response.headers.entries()])
        );

        const data = await response.json();
        console.log("Login response data:", data);

        if (response.ok) {
          console.log("Login successful, data:", data);

          if (!data.data || !data.data.accessToken) {
            console.error("Missing token in response:", data);
            showNotification("Invalid response format from server", "error");
            return;
          }

          // Save token to localStorage
          localStorage.setItem("accessToken", data.data.accessToken);
          localStorage.setItem("refreshToken", data.data.refreshToken);

          // Store user info if available
          if (data.data.user) {
            localStorage.setItem("user", JSON.stringify(data.data.user));
          }

          showNotification("Login successful! Redirecting...", "success");

          // Redirect to dashboard or home
          setTimeout(() => {
            window.location.href = "../dashboard.html";
          }, 1500);
        } else {
          console.error("Login failed:", data);
          showNotification(
            data.message || "Login failed. Please try again.",
            "error"
          );
        }
      } catch (error) {
        console.error("Login error details:", error);
        showNotification(
          `Login error: ${error.message || "Unknown error"}`,
          "error"
        );
      } finally {
        showLoading(false);
      }
    });
  }

  // Form submission for registration
  if (registerForm) {
    registerForm.addEventListener("submit", async function (e) {
      e.preventDefault();

      const fullname = document.getElementById("fullname").value;
      const username = document.getElementById("username").value;
      const email = document.getElementById("email").value;
      const password = document.getElementById("password").value;
      const avatar = document.getElementById("avatar").files[0];
      const coverImage = document.getElementById("cover-image").files[0];

      if (!avatar) {
        showNotification("Profile picture is required", "error");
        return;
      }

      const formData = new FormData();
      formData.append("fullname", fullname);
      formData.append("username", username);
      formData.append("email", email);
      formData.append("password", password);
      formData.append("avatar", avatar);

      if (coverImage) {
        formData.append("coverImage", coverImage);
      }

      try {
        showLoading(true);

        // Debug info
        console.log("Attempting registration with:", {
          fullname,
          username,
          email,
        });
        console.log("API URL:", `${window.API_BASE_URL}/users/register`);

        const response = await fetch(`${window.API_BASE_URL}/users/register`, {
          method: "POST",
          body: formData,
        });

        // Debug response status
        console.log("Registration response status:", response.status);

        const data = await response.json();
        console.log("Registration response data:", data);

        if (response.ok) {
          console.log("Registration successful, data:", data);
          showNotification(
            "Registration successful! You can now log in.",
            "success"
          );

          // Switch to login form
          setTimeout(() => {
            registerForm.classList.add("hidden");
            loginForm.classList.remove("hidden");
          }, 2000);
        } else {
          console.error("Registration failed:", data);
          showNotification(
            data.message || "Registration failed. Please try again.",
            "error"
          );
        }
      } catch (error) {
        console.error("Registration error details:", error);
        showNotification(
          `Registration error: ${error.message || "Unknown error"}`,
          "error"
        );
      } finally {
        showLoading(false);
      }
    });
  }

  // Helper functions
  function showLoading(show) {
    const loadingOverlay = document.getElementById("loading-overlay");
    if (loadingOverlay) {
      if (show) {
        loadingOverlay.classList.remove("hidden");
      } else {
        loadingOverlay.classList.add("hidden");
      }
    }
  }

  function showNotification(message, type) {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll(".notification");
    existingNotifications.forEach((notification) => {
      notification.remove();
    });

    // Create notification element
    const notification = document.createElement("div");
    notification.className = `notification ${type}`;

    // Create content wrapper
    const content = document.createElement("div");
    content.className = "flex items-center justify-between";

    // Add message
    const messageSpan = document.createElement("span");
    messageSpan.textContent = message;
    content.appendChild(messageSpan);

    // Add close button
    const closeBtn = document.createElement("span");
    closeBtn.className = "notification-close ml-3 cursor-pointer";
    closeBtn.innerHTML = "&times;";
    closeBtn.addEventListener("click", () => {
      notification.remove();
    });
    content.appendChild(closeBtn);

    notification.appendChild(content);
    document.body.appendChild(notification);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (document.body.contains(notification)) {
        notification.remove();
      }
    }, 5000);
  }
});
