const API_BASE = "http://localhost:4000";

const registerForm = document.getElementById("registerForm");
if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("registerEmail").value;
    const password = document.getElementById("registerPassword").value;
    const msg = document.getElementById("registerMsg");

    const res = await fetch(`${API_BASE}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    msg.textContent = data.message;
  });
}

const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;
    const msg = document.getElementById("loginMsg");

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

      if (data.user.role === "admin") {
        window.location.href = "admin.html";
      } else {
        window.location.href = "user.html";
      }
    } else {
      msg.textContent = data.message || "Login failed";
    }
  });
}

async function loadUserPage() {
  const userInfo = document.getElementById("userInfo");
  if (!userInfo) return;

  const token = localStorage.getItem("token");

  const res = await fetch(`${API_BASE}/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const data = await res.json();
  userInfo.textContent = `Welcome ${data.email} | Role: ${data.role} | API calls used: ${data.api_calls_used}`;
}

async function loadAdminPage() {
  const adminInfo = document.getElementById("adminInfo");
  if (!adminInfo) return;

  const token = localStorage.getItem("token");

  const res = await fetch(`${API_BASE}/auth/admin/users`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const data = await res.json();
  adminInfo.textContent = JSON.stringify(data, null, 2);
}

function logout() {
  localStorage.clear();
  window.location.href = "login.html";
}

loadUserPage();
loadAdminPage();