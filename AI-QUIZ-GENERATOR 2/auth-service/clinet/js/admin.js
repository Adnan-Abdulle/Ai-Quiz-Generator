let currentQuizPreview = null;
let selectedQuizId = null;
let selectedStudentIds = [];
let assignableStudents = [];


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

async function loadResults() {
    const resultsList = document.getElementById("resultsList");
    if (!resultsList) return;

    const token = localStorage.getItem("token");

    try {
        const res = await fetch(`${API_BASE}/auth/teacher/results`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const data = await res.json();

        if (!Array.isArray(data)) {
            resultsList.innerHTML = "<p>No results yet.</p>";
            return;
        }

        resultsList.innerHTML = data.map(r => `
      <div class="quiz-card">
        <p><strong>User:</strong> ${r.email}</p>
        <p><strong>Topic:</strong> ${r.topic}</p>
        <p><strong>Score:</strong> ${r.score}</p>
        <p><strong>Feedback:</strong> ${r.feedback}</p>
      </div>
    `).join("");

    } catch (err) {
        console.error(err);
        resultsList.innerHTML = "<p>Failed to load results</p>";
    }
}

const role = localStorage.getItem("role");
if (role === "teacher" || role === "admin") {
    loadAdminPage();
    loadResults();
    loadStudentsForTeacher();
    loadAllQuizzesForTeacher();
}
