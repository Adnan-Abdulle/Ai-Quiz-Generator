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

const role = localStorage.getItem("role");
if (role === "user") {
    loadUserPage();
    loadQuizzes();
}
