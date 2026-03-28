// const API_BASE = "https://ai-quiz-generator-2-hk2a.onrender.com";
const API_BASE = "http://localhost:4000";


const registerForm = document.getElementById("registerForm");
if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("registerEmail").value;
    const password = document.getElementById("registerPassword").value;
    const msg = document.getElementById("registerMsg");

    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      msg.textContent = data.message;
    } catch (err) {
      msg.textContent = "Server error";
    }
  });
}

const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;
    const msg = document.getElementById("loginMsg");

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (data.token) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("role", data.user.role);
        localStorage.setItem("email", data.user.email);

if (data.user.role === "admin" || data.user.role === "teacher") {
  window.location.href = "admin.html";
} else {
  window.location.href = "user.html";
}
      } else {
        msg.textContent = data.message || "Login failed";
      }
    } catch (err) {
      msg.textContent = "Server error";
    }
  });
}

const forgotLink = document.getElementById("forgotLink");
const forgotSection = document.getElementById("forgotSection");
if (forgotLink && forgotSection) {
  forgotLink.addEventListener("click", (e) => {
    e.preventDefault();

    if (forgotSection.style.display === "none" || forgotSection.style.display === "") {
      forgotSection.style.display = "block";
    } else {
      forgotSection.style.display = "none";
    }
  });
}

const sendTokenBtn = document.getElementById("sendTokenBtn");
if (sendTokenBtn) {
  sendTokenBtn.addEventListener("click", async () => {
    const email = document.getElementById("fpEmail").value;
    const msg = document.getElementById("fpMsg");

    if (!email) {
      msg.textContent = "Please enter your email";
      return;
    }

    try {
      msg.textContent = "Sending...";
      const res = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email })
      });

      const data = await res.json();
      msg.textContent = data.message || "If this email exists, a reset link has been sent";
    } catch (err) {
      msg.textContent = "Server error";
    }
  });
}

const resetPasswordForm = document.getElementById("resetPasswordForm");
if (resetPasswordForm) {
  resetPasswordForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const tokenInput = document.getElementById("resetToken");
    const newPasswordInput = document.getElementById("resetNewPassword");
    const msg = document.getElementById("resetMsg");

    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = urlParams.get("token");

    const token = tokenInput ? tokenInput.value || tokenFromUrl : tokenFromUrl;
    const newPassword = newPasswordInput.value;

    if (!token || !newPassword) {
      msg.textContent = "Missing token or new password";
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/auth/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ token, newPassword })
      });

      const data = await res.json();
      msg.textContent = data.message;

      if (data.message === "Password reset successful") {
        setTimeout(() => {
          window.location.href = "login.html";
        }, 1500);
      }
    } catch (err) {
      msg.textContent = "Server error";
    }
  });
}

function fillResetTokenFromUrl() {
  const tokenInput = document.getElementById("resetToken");
  if (!tokenInput) return;

  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get("token");

  if (token) {
    tokenInput.value = token;
  }
}

async function loadUserPage() {
  const userInfo = document.getElementById("userInfo");
  if (!userInfo) return;

  const token = localStorage.getItem("token");

  try {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await res.json();
    userInfo.textContent = `Welcome ${data.email} | Role: ${data.role} `;
  } catch (err) {
    userInfo.textContent = "Failed to load user info";
  }
}

async function loadAdminPage() {
  const adminInfo = document.getElementById("adminInfo");
  if (!adminInfo) return;

  const token = localStorage.getItem("token");

  try {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await res.json();

    if (!res.ok) {
      adminInfo.textContent = data.message || "Failed to load admin data";
      return;
    }

    adminInfo.textContent = `Admin: ${data.email}
Role: ${data.role}
API Calls Used: ${data.api_calls_used}`;
  } catch (err) {
    adminInfo.textContent = "Failed to load admin data";
    console.error(err);
  }
}

function logout() {
  localStorage.clear();
  window.location.href = "login.html";
}

const generateBtn = document.getElementById("generateQuizBtn");

if (generateBtn) {
  generateBtn.addEventListener("click", generate);
}
async function generate() {
  const topic = document.getElementById("quizTopic").value;
  const difficulty = document.getElementById("quizDifficulty").value;
  const count = document.getElementById("quizCount").value;

  const quizList = document.getElementById("quizList");
  const generateMsg = document.getElementById("generateMsg");

  quizList.innerHTML = "";
  generateMsg.textContent = "Generating...";

  try {
    const res = await fetch(`${API_BASE}/auth/admin/create-quiz`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${localStorage.getItem("token")}`
      },
      body: JSON.stringify({ topic, difficulty, count })
    });

    const data = await res.json();

    if (!res.ok) {
      generateMsg.textContent = data.error || data.message || "Failed to generate quiz";
      return;
    }

    if (data.warning) {
      const warned = localStorage.getItem("apiLimitWarned");

      if (!warned) {
        alert(data.warning);
        localStorage.setItem("apiLimitWarned", "true");
      }
    }

    generateMsg.textContent = "Quiz generated successfully";

    const ul = document.createElement("ul");

    data.questions.forEach(q => {
      const li = document.createElement("li");
      li.textContent = q;
      ul.appendChild(li);
    });

    quizList.innerHTML = "";
    quizList.appendChild(ul);

    await loadAdminPage();
  } catch (error) {
    generateMsg.textContent = "Server error while generating quiz";
    console.error(error);
  }
}

async function loadQuizzes() {
  const quizList = document.getElementById("availableQuizzes");
  if (!quizList) return;

  const token = localStorage.getItem("token");

  try {
    const res = await fetch(`${API_BASE}/auth/quizzes`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const quizzes = await res.json();

    quizList.innerHTML = "";

    quizzes.forEach(quiz => {
      const container = document.createElement("div");
      container.className = "quiz-card";

      const title = document.createElement("h4");
      title.textContent = `${quiz.topic} (${quiz.difficulty})`;

      const ul = document.createElement("ul");

    
      const questions = typeof quiz.questions === "string"
        ? JSON.parse(quiz.questions)
        : quiz.questions;

      questions.forEach(q => {
        const li = document.createElement("li");
        li.textContent = q;
        ul.appendChild(li);
      });

      container.appendChild(title);
      container.appendChild(ul);
      quizList.appendChild(container);
    });

  } catch (err) {
    quizList.textContent = "Failed to load quizzes";
    console.error(err);
  }
}

fillResetTokenFromUrl();
loadUserPage();
loadAdminPage();
loadQuizzes();