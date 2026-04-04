
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

fillResetTokenFromUrl();

function logout() {
    localStorage.clear();
    window.location.href = "login.html";
}