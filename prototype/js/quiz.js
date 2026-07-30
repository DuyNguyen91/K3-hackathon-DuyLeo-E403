// Quiz rendering and answer handling for the prototype.
document.addEventListener("DOMContentLoaded", () => {
  renderQuiz();
});

function renderQuiz() {
  const questionEl = document.getElementById("quizQuestion");
  const optionsEl = document.getElementById("quizOptions");
  const resultEl = document.getElementById("quizResult");
  const quiz = response.quiz[0];

  if (!questionEl || !optionsEl || !resultEl || !quiz) return;

  questionEl.textContent = quiz.question;
  optionsEl.innerHTML = quiz.options
    .map(
      (option, index) => `
        <div class="option-item">
          <input type="radio" id="option-${index}" name="quizChoice" value="${index}" />
          <label for="option-${index}">${option}</label>
        </div>
      `
    )
    .join("");

  const form = document.getElementById("quizForm");
  if (!form) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const selected = document.querySelector('input[name="quizChoice"]:checked');

    if (!selected) {
      resultEl.hidden = false;
      resultEl.innerHTML = '<p>Please select an answer.</p>';
      return;
    }

    const score = Number(selected.value) === quiz.correct ? "100%" : "0%";
    resultEl.hidden = false;
    resultEl.innerHTML = `<h4>Score: ${score}</h4><p>Correct answer: ${quiz.options[quiz.correct]}</p>`;
  });
}
