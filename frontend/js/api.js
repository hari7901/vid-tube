// API Base URL - update this to match your backend server address
const API_BASE_URL = "http://localhost:8000/api/v1";

// Make it available globally
window.API_BASE_URL = API_BASE_URL;

// API class to handle all requests
class Api {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
  }

  // Helper method for making API requests
  async request(endpoint, options = {}) {
    const token = localStorage.getItem("accessToken");

    // Set default headers
    const headers = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    // Add authorization header if token exists
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    // Create request options
    const requestOptions = {
      ...options,
      headers,
    };

    try {
      const response = await fetch(
        `${this.baseUrl}${endpoint}`,
        requestOptions
      );

      // Handle token expiration
      if (response.status === 401) {
        // Try to refresh token
        const refreshed = await this.refreshToken();
        if (refreshed) {
          // Retry the original request with new token
          return this.request(endpoint, options);
        } else {
          // Redirect to login if refresh fails
          this.clearAuth();
          window.location.href = "/pages/auth.html";
          throw new Error("Session expired. Please login again.");
        }
      }

      // Parse response
      const data = await response.json();
      return { data, status: response.status, ok: response.ok };
    } catch (error) {
      console.error("API request error:", error);
      throw error;
    }
  }

  // Method for refreshing access token
  async refreshToken() {
    const refreshToken = localStorage.getItem("refreshToken");
    if (!refreshToken) return false;

    try {
      const response = await fetch(`${this.baseUrl}/users/refresh-token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem("accessToken", data.data.accessToken);
        localStorage.setItem("refreshToken", data.data.refreshToken);
        return true;
      } else {
        this.clearAuth();
        return false;
      }
    } catch (error) {
      console.error("Token refresh error:", error);
      this.clearAuth();
      return false;
    }
  }

  // Method to clear authentication data
  clearAuth() {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
  }

  // More API methods...
}

// Create and export API instance
const api = new Api(API_BASE_URL);
window.api = api;
