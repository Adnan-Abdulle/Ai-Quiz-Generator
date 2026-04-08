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
        quizList.innerHTML = "";

        if (!Array.isArray(quizzes) || quizzes.length === 0) {
            quizList.innerHTML = "<p>No quizzes assigned yet.</p>";
            return;
        }

        quizzes.forEach((quiz) => {
            const container = document.createElement("div");
            container.className = "quiz-card";

            const header = document.createElement("div");
            header.className = "quiz-drawer-header";

            const titleWrap = document.createElement("div");

            const title = document.createElement("h4");
            title.textContent = `${quiz.topic} (${quiz.difficulty})`;

            const description = document.createElement("p");
            description.className = "quiz-description";
            description.textContent = "Click to open this quiz.";

            titleWrap.appendChild(title);
            titleWrap.appendChild(description);

            const rightWrap = document.createElement("div");
            rightWrap.className = "quiz-drawer-right";

            const tag = document.createElement("span");
            tag.className = "quiz-tag";
            tag.textContent = "Assigned";

            const icon = document.createElement("span");
            icon.className = "quiz-drawer-icon";
            icon.textContent = "▼";

            rightWrap.appendChild(tag);
            rightWrap.appendChild(icon);

            header.appendChild(titleWrap);
            header.appendChild(rightWrap);

            const quizContent = document.createElement("div");
            quizContent.className = "quiz-drawer-content";

            const form = document.createElement("form");
            form.className = "quiz-form";

            const questions = typeof quiz.questions === "string"
                ? JSON.parse(quiz.questions)
                : quiz.questions;

            questions.forEach((q, index) => {
                const questionBlock = document.createElement("div");
                questionBlock.className = "question-block";

                const questionLabel = document.createElement("label");
                questionLabel.innerHTML = `<strong>Question ${index + 1}:</strong> ${q}`;

                const textarea = document.createElement("textarea");
                textarea.name = `answer${index}`;
                textarea.rows = 4;
                textarea.placeholder = "Type your answer here...";
                textarea.required = true;

                questionBlock.appendChild(questionLabel);
                questionBlock.appendChild(textarea);
                form.appendChild(questionBlock);
            });

            const submitBtn = document.createElement("button");
            submitBtn.type = "submit";
            submitBtn.textContent = "Submit Quiz";
            submitBtn.className = "submit-btn";

            form.appendChild(submitBtn);
            quizContent.appendChild(form);

            header.addEventListener("click", () => {
                const allContents = document.querySelectorAll(".quiz-drawer-content");
                const allHeaders = document.querySelectorAll(".quiz-drawer-header");
                const allTags = document.querySelectorAll(".quiz-tag");

                const isOpen = quizContent.classList.contains("open");

                allContents.forEach((content) => content.classList.remove("open"));
                allHeaders.forEach((item) => item.classList.remove("active"));
                allTags.forEach((item) => {
                    if (item.textContent !== "Submitted") {
                        item.textContent = "Assigned";
                    }
                });

                if (!isOpen) {
                    quizContent.classList.add("open");
                    header.classList.add("active");
                    if (tag.textContent !== "Submitted") {
                        tag.textContent = "Open";
                    }
                }
            });

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

                        quizContent.classList.remove("open");
                        header.classList.remove("active");
                        tag.textContent = "Submitted";

                        const oldResult = container.querySelector(".quiz-result");
                        if (oldResult) {
                            oldResult.remove();
                        }

                        const resultDiv = document.createElement("div");
                        resultDiv.className = "quiz-result";
                        resultDiv.innerHTML = `
                            <h4>Your Result</h4>
                            <p><strong>Score:</strong> ${data.score}</p>
                            <p><strong>Feedback:</strong> ${data.feedback}</p>
                        `;

                        container.appendChild(resultDiv);
                    } else {
                        alert(data.message || "Failed to submit quiz");
                    }
                } catch (err) {
                    alert("Server error while submitting quiz");
                    console.error(err);
                }
            });

            container.appendChild(header);
            container.appendChild(quizContent);

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

const role = localStorage.getItem("role");
if (role === "user") {
    loadUserPage();
    loadQuizzes();
}
