// const API_BASE = "https://ai-quiz-generator-2-hk2a.onrender.com";
const API_BASE = "http://localhost:4000";


let currentQuizPreview = null;
let selectedQuizId = null;
let selectedQuizTitle = "";
let selectedStudentIds = [];
let assignableStudents = [];

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
    const res = await fetch(`${API_BASE}/auth/admin/generate-preview`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${localStorage.getItem("token")}`
      },
      body: JSON.stringify({ topic, difficulty, count })
    });

    const data = await res.json();

    if (!res.ok) {
      generateMsg.textContent = data.error || data.message || "Failed to generate quiz preview";
      return;
    }

    currentQuizPreview = {
      topic,
      difficulty,
      questions: data.questions
    };

    generateMsg.textContent = "Quiz preview generated successfully";

    const container = document.createElement("div");

    const title = document.createElement("h4");
    title.textContent = `Preview: ${topic} (${difficulty})`;
    container.appendChild(title);

    const ul = document.createElement("ul");

    data.questions.forEach((q) => {
      const li = document.createElement("li");
      li.textContent = q;
      ul.appendChild(li);
    });

    container.appendChild(ul);
    const publishBtn = document.createElement("button");
    publishBtn.textContent = "Publish";
    publishBtn.onclick = publishQuiz;

    const discardBtn = document.createElement("button");
    discardBtn.textContent = "Do Not Publish";
    discardBtn.onclick = discardQuiz;

    const btnContainer = document.createElement("div");
    btnContainer.style.marginTop = "10px";
    btnContainer.appendChild(publishBtn);
    btnContainer.appendChild(discardBtn);

    container.appendChild(btnContainer);
    publishBtn.classList.add("publish-btn");
    discardBtn.classList.add("discard-btn");
    btnContainer.classList.add("preview-btn-container");

    quizList.innerHTML = "";
    quizList.appendChild(container);

  } catch (error) {
    generateMsg.textContent = "Server error while generating quiz preview";
    console.error(error);
  }
}

async function publishQuiz() {
  const generateMsg = document.getElementById("generateMsg");

  if (!currentQuizPreview) {
    generateMsg.textContent = "No quiz to publish";
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/auth/admin/publish-quiz`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`
      },
      body: JSON.stringify(currentQuizPreview)
    });

    const data = await res.json();

    if (!res.ok) {
      generateMsg.textContent = data.message || "Failed to publish quiz";
      return;
    }

    generateMsg.textContent = "Quiz published successfully";

    currentQuizPreview = null;
    document.getElementById("quizList").innerHTML = "";


    loadAllQuizzesForTeacher();

  } catch (err) {
    console.error(err);
    generateMsg.textContent = "Server error while publishing";
  }
}

function discardQuiz() {
  const generateMsg = document.getElementById("generateMsg");

  currentQuizPreview = null;
  document.getElementById("quizList").innerHTML = "";

  generateMsg.textContent = "Quiz discarded";
}


async function assignQuiz() {
  const userIdsInput = document.getElementById("assignUserIds").value;
  const quizId = document.getElementById("assignQuizId").value;
  const assignMsg = document.getElementById("assignMsg");

  const studentIds = userIdsInput
    .split(",")
    .map(id => id.trim())
    .filter(id => id !== "")
    .map(id => Number(id));

  if (!quizId || studentIds.length === 0) {
    assignMsg.textContent = "Please enter quiz ID and at least one user ID";
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/auth/teacher/assign`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`
      },
      body: JSON.stringify({
        quizId: Number(quizId),
        studentIds: studentIds
      })
    });

    const data = await res.json();
    assignMsg.textContent = data.message || "Assignment completed";

    console.log("Assign response:", data);
  } catch (err) {
    console.error("Assign error:", err);
    assignMsg.textContent = "Failed to assign quiz";
  }
}


async function loadQuizzes() {
  const quizList = document.getElementById("availableQuizzes");
  if (!quizList) return;

  const token = localStorage.getItem("token");

  try {
    const res = await fetch(`${API_BASE}/auth/user/quizzes`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const quizzes = await res.json();
    console.log("Quizzes:", quizzes);
    quizList.innerHTML = "";


    if (!Array.isArray(quizzes) || quizzes.length === 0) {
  quizList.innerHTML = "<p>No quizzes assigned yet.</p>";
  return;
}

    quizzes.forEach((quiz, quizIndex) => {
      const container = document.createElement("div");
      container.className = "quiz-card";

      const title = document.createElement("h4");
      title.textContent = `${quiz.topic} (${quiz.difficulty})`;

      const form = document.createElement("form");
      form.className = "quiz-form";

      const questions = typeof quiz.questions === "string"
        ? JSON.parse(quiz.questions)
        : quiz.questions;

      questions.forEach((q, index) => {
        const questionBlock = document.createElement("div");
        questionBlock.className = "question-block";

        const questionText = document.createElement("p");
        questionText.innerHTML = `<strong>Q${index + 1}:</strong> ${q}`;

        const textarea = document.createElement("textarea");
        textarea.name = `answer${index}`;
        textarea.rows = 3;
        textarea.placeholder = "Type your answer here...";
        textarea.required = true;

        questionBlock.appendChild(questionText);
        questionBlock.appendChild(textarea);

        form.appendChild(questionBlock);
      });

      const submitBtn = document.createElement("button");
      submitBtn.type = "submit";
      submitBtn.textContent = "Submit Answers";

      form.appendChild(submitBtn);

      // 🚀 Handle submit
      form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const answers = [];

        questions.forEach((_, index) => {
          const value = form.querySelector(`textarea[name="answer${index}"]`).value;
          answers.push(value);
        });

        try {
          const res = await fetch(`${API_BASE}/auth/submit-quiz`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
              quiz_id: quiz.id,
              answers: answers
            })
          });

          const data = await res.json();

          if (res.ok) {
            alert("Quiz submitted successfully!");
          } else {
            alert(data.message || "Failed to submit quiz");
          }
        } catch (err) {
          alert("Server error while submitting quiz");
          console.error(err);
        }
      });

      container.appendChild(title);
      container.appendChild(form);
      quizList.appendChild(container);
    });

  } catch (err) {
    quizList.textContent = "Failed to load quizzes";
    console.error(err);
  }

}

const assignBtn = document.getElementById("assignQuizBtn");

if (assignBtn) {
  assignBtn.addEventListener("click", assignQuiz);
}

async function loadStudentsForTeacher() {
  const studentList = document.getElementById("studentList");
  if (!studentList) return;

  const token = localStorage.getItem("token");

  try {
    const res = await fetch(`${API_BASE}/auth/students`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await res.json();

    if (!res.ok) {
      studentList.innerHTML = `<p>${data.message || "Failed to load students"}</p>`;
      return;
    }

    if (!Array.isArray(data) || data.length === 0) {
      studentList.innerHTML = "<p>No students found.</p>";
      return;
    }

    studentList.innerHTML = data.map(user => `
      <div class="quiz-card">
        <p><strong>ID:</strong> ${user.id}</p>
        <p><strong>Email:</strong> ${user.email}</p>
        <p><strong>Role:</strong> ${user.role}</p>
      </div>
    `).join("");
  } catch (err) {
    console.error(err);
    studentList.innerHTML = "<p>Failed to load students</p>";
  }
}

async function loadAllQuizzesForTeacher() {
  const teacherQuizList = document.getElementById("teacherQuizList");
  if (!teacherQuizList) return;

  const token = localStorage.getItem("token");

  try {
    const res = await fetch(`${API_BASE}/auth/quizzes`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await res.json();

    if (!res.ok) {
      teacherQuizList.innerHTML = `<p>${data.message || "Failed to load quizzes"}</p>`;
      return;
    }

    if (!Array.isArray(data) || data.length === 0) {
      teacherQuizList.innerHTML = "<p>No quizzes found.</p>";
      return;
    }

    teacherQuizList.innerHTML = data.map(quiz => `
      <div class="quiz-card">
        <p><strong>ID:</strong> ${quiz.id}</p>
        <p><strong>Topic:</strong> ${quiz.topic}</p>
        <p><strong>Difficulty:</strong> ${quiz.difficulty}</p>
         <div class="quiz-actions">
        <button onclick="openAssignModal(${quiz.id}, '${quiz.topic}', '${quiz.difficulty}')"> Assign </button>
        <button onclick="deleteQuiz(${quiz.id})" class="delete-btn"> Delete </button>
      </div>
      </div>
    `).join("");
  } catch (err) {
    console.error(err);
    teacherQuizList.innerHTML = "<p>Failed to load quizzes</p>";
  }
}

async function openAssignModal(quizId, topic, difficulty) {
  selectedQuizId = quizId;
  selectedStudentIds = [];

  const modal = document.getElementById("assignModal");
  const title = document.getElementById("assignModalTitle");
  const msg = document.getElementById("assignModalMsg");

  title.textContent = `Assign Quiz: ${topic} (${difficulty})`;
  msg.textContent = "";

  await renderStudentsForAssignModal();

  modal.classList.remove("hidden");
}

function closeAssignModal() {
  const modal = document.getElementById("assignModal");
  const msg = document.getElementById("assignModalMsg");

  selectedQuizId = null;
  selectedStudentIds = [];
  msg.textContent = "";

  modal.classList.add("hidden");
}

async function renderStudentsForAssignModal() {
  const container = document.getElementById("assignStudentList");
  const token = localStorage.getItem("token");

  container.innerHTML = "<p>Loading students...</p>";

  try {
    const res = await fetch(`${API_BASE}/auth/teacher/assignable-students/${selectedQuizId}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await res.json();

    if (!res.ok) {
      container.innerHTML = `<p>${data.message || "Failed to load students"}</p>`;
      return;
    }

    if (!Array.isArray(data) || data.length === 0) {
      container.innerHTML = "<p>No students found.</p>";
      return;
    }

    assignableStudents = data.filter(user => user.role === "user");
    displayStudentCards();

  } catch (err) {
    console.error(err);
    container.innerHTML = "<p>Failed to load students</p>";
  }
}
function displayStudentCards() {
  const container = document.getElementById("assignStudentList");

  if (!assignableStudents.length) {
    container.innerHTML = "<p>No students found.</p>";
    return;
  }

  container.innerHTML = assignableStudents.map(user => `
    <div
      class="student-select-card ${selectedStudentIds.includes(user.id) ? "selected" : ""}"
      onclick="toggleStudentSelection(${user.id})"
    >
      <p><strong>Email:</strong> ${user.email}</p>
      <p><strong>ID:</strong> ${user.id}</p>
    </div>
  `).join("");
}
function toggleDrawer(drawerId) {
  const drawer = document.getElementById(drawerId);
  if (!drawer) return;

  const header = drawer.previousElementSibling;

  drawer.classList.toggle("open");

  if (header) {
    header.classList.toggle("active");
  }
}

function toggleStudentSelection(studentId) {
  if (selectedStudentIds.includes(studentId)) {
    selectedStudentIds = selectedStudentIds.filter(id => id !== studentId);
  } else {
    selectedStudentIds.push(studentId);
  }

  displayStudentCards();
}

async function assignSelectedStudents() {
  const msg = document.getElementById("assignModalMsg");

  if (!selectedQuizId) {
    msg.textContent = "No quiz selected.";
    return;
  }

  if (selectedStudentIds.length === 0) {
    msg.textContent = "Please select at least one student.";
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/auth/teacher/assign`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`
      },
      body: JSON.stringify({
        quizId: selectedQuizId,
        studentIds: selectedStudentIds
      })
    });

    const data = await res.json();

    if (!res.ok) {
      msg.textContent = data.message || "Failed to assign quiz.";
      return;
    }

    msg.textContent = data.message || "Quiz assigned successfully.";

    setTimeout(() => {
      closeAssignModal();
    }, 1000);

  } catch (err) {
    console.error(err);
    msg.textContent = "Server error while assigning quiz.";
  }
}

const confirmAssignBtn = document.getElementById("confirmAssignBtn");

if (confirmAssignBtn) {
  confirmAssignBtn.addEventListener("click", assignSelectedStudents);
}

const role = localStorage.getItem("role");

if (role === "teacher" || role === "admin") {
  loadStudentsForTeacher();
  loadAllQuizzesForTeacher();
}

async function deleteQuiz(quizId) {
  const confirmDelete = confirm("Are you sure you want to delete this quiz?");
  if (!confirmDelete) return;

  try {
    const res = await fetch(`${API_BASE}/auth/admin/delete-quiz/${quizId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`
      }
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.message || "Failed to delete quiz");
      return;
    }

    loadAllQuizzesForTeacher();

  } catch (err) {
    console.error(err);
    alert("Server error while deleting quiz");
  }
}

fillResetTokenFromUrl();
loadUserPage();

loadQuizzes();