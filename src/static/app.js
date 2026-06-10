document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const loginBtn = document.getElementById("login-btn");
  const logoutBtn = document.getElementById("logout-btn");
  const loginContainer = document.getElementById("login-container");
  const loginForm = document.getElementById("login-form");
  const authStatus = document.getElementById("auth-status");
  const signupContainer = document.getElementById("signup-container");
  const messageDiv = document.getElementById("message");

  let authToken = localStorage.getItem("teacherToken");
  let teacherName = null;

  function authHeaders() {
    return authToken
      ? { Authorization: `Bearer ${authToken}`, "Content-Type": "application/json" }
      : { "Content-Type": "application/json" };
  }

  function showMessage(text, type) {
    messageDiv.textContent = text;
    messageDiv.className = type;
    messageDiv.classList.remove("hidden");
    setTimeout(() => {
      messageDiv.classList.add("hidden");
    }, 5000);
  }

  async function checkAuth() {
    if (!authToken) {
      teacherName = null;
      updateUiForAuth();
      return;
    }

    try {
      const response = await fetch("/auth/status", {
        headers: authHeaders(),
      });

      if (!response.ok) {
        authToken = null;
        localStorage.removeItem("teacherToken");
        teacherName = null;
        updateUiForAuth();
        return;
      }

      const result = await response.json();
      teacherName = result.username;
      updateUiForAuth();
    } catch (error) {
      authToken = null;
      localStorage.removeItem("teacherToken");
      teacherName = null;
      updateUiForAuth();
      console.error("Error checking auth status:", error);
    }
  }

  function updateUiForAuth() {
    if (teacherName) {
      authStatus.textContent = `Logged in as ${teacherName}`;
      authStatus.classList.remove("hidden");
      loginBtn.classList.add("hidden");
      loginContainer.classList.add("hidden");
      signupContainer.classList.remove("hidden");
      logoutBtn.classList.remove("hidden");
    } else {
      authStatus.classList.add("hidden");
      loginBtn.classList.remove("hidden");
      signupContainer.classList.add("hidden");
      logoutBtn.classList.add("hidden");
    }
  }

  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      activitiesList.innerHTML = "";
      activitySelect.innerHTML = "<option value=\"\">-- Select an activity --</option>";

      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;
        const participantsHTML = details.participants.length > 0
          ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants.map((email) => {
                  const deleteButton = teacherName
                    ? `<button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button>`
                    : "";
                  return `<li><span class="participant-email">${email}</span>${deleteButton}</li>`;
                }).join("")}
              </ul>
            </div>`
          : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", handleUnregister);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
          headers: authHeaders(),
        }
      );

      const result = await response.json();
      if (response.ok) {
        showMessage(result.message, "success");
        fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to unregister. Please try again.", "error");
      console.error("Error unregistering:", error);
    }
  }

  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    if (!teacherName) {
      showMessage("You must be logged in as a teacher to register students.", "error");
      return;
    }

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
          headers: authHeaders(),
        }
      );

      const result = await response.json();
      if (response.ok) {
        showMessage(result.message, "success");
        signupForm.reset();
        fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to sign up. Please try again.", "error");
      console.error("Error signing up:", error);
    }
  });

  loginBtn.addEventListener("click", () => {
    loginContainer.classList.toggle("hidden");
  });

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    try {
      const response = await fetch("/login", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ username, password }),
      });

      const result = await response.json();
      if (response.ok) {
        authToken = result.token;
        localStorage.setItem("teacherToken", authToken);
        teacherName = result.username;
        updateUiForAuth();
        fetchActivities();
        loginForm.reset();
        loginContainer.classList.add("hidden");
        showMessage("Teacher logged in successfully.", "success");
      } else {
        showMessage(result.detail || "Login failed.", "error");
      }
    } catch (error) {
      showMessage("Login request failed. Please try again.", "error");
      console.error("Error during login:", error);
    }
  });

  logoutBtn.addEventListener("click", async () => {
    try {
      await fetch("/logout", {
        method: "POST",
        headers: authHeaders(),
      });
    } catch (error) {
      console.error("Error during logout:", error);
    }

    authToken = null;
    teacherName = null;
    localStorage.removeItem("teacherToken");
    updateUiForAuth();
    fetchActivities();
    showMessage("Logged out.", "info");
  });

  checkAuth().then(fetchActivities);
});
