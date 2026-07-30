// Shared prototype behavior for navigation, tabs, loading, and toast handling.
document.addEventListener("DOMContentLoaded", () => {
  const page = document.body.dataset.page;

  if (page === "result") {
    populateResult();
    setupTabs();
  }

  if (page === "chat") {
    setupChatFlow();
  }

  if (page === "sources") {
    renderSources();
  }

  if (page === "note") {
    setupNoteSave();
  }

  if (page === "quiz") {
    renderQuiz();
  }
});

function populateResult() {
  const answerEl = document.getElementById("answerText");
  const summaryEl = document.getElementById("summaryList");

  if (answerEl) {
    answerEl.textContent = response.answer;
  }

  if (summaryEl) {
    summaryEl.innerHTML = response.summary
      .map((item) => `<li>${item}</li>`)
      .join("");
  }
}

function setupTabs() {
  const tabs = document.querySelectorAll(".tab");

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((item) => item.classList.remove("active"));
      tab.classList.add("active");

      const target = tab.dataset.tab;
      document.querySelectorAll(".tab-panel").forEach((panel) => {
        panel.hidden = panel.id !== `panel${target[0].toUpperCase()}${target.slice(1)}`;
      });
    });
  });
}

function setupChatFlow() {
  const form = document.getElementById("chatForm");
  const loadingState = document.getElementById("loadingState");

  if (!form) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const input = document.getElementById("questionInput");
    const thread = document.querySelector(".chat-thread");

    if (!input || !thread) return;

    const bubble = document.createElement("div");
    bubble.className = "message user-message";
    bubble.innerHTML = `<div class="message-bubble user-bubble"><p>${input.value || "Explain this paragraph in simple words."}</p></div>`;
    thread.appendChild(bubble);

    loadingState.hidden = false;

    setTimeout(() => {
      loadingState.hidden = true;
      const responseBubble = document.createElement("div");
      responseBubble.className = "message ai-message";
      responseBubble.innerHTML = `<div class="avatar">V</div><div class="message-bubble"><p>${response.answer}</p></div>`;
      thread.appendChild(responseBubble);
    }, 1200);

    input.value = "";
  });
}

function renderSources() {
  const list = document.getElementById("sourceList");
  if (!list) return;

  list.innerHTML = response.sources
    .map(
      (source) => `
        <article class="source-card">
          <div class="upload-card-head">
            <div>
              <h4>${source.title}</h4>
              <p>${source.page}</p>
            </div>
            <span class="pill">${source.confidence}</span>
          </div>
          <p>${source.title} contains the explanation used by the AI assistant.</p>
        </article>
      `
    )
    .join("");
}

function setupNoteSave() {
  const button = document.getElementById("saveNoteBtn");
  const toast = document.getElementById("toast");

  if (!button || !toast) return;

  button.addEventListener("click", () => {
    toast.textContent = "Saved successfully";
    toast.hidden = false;
    toast.classList.add("show");
    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => {
        toast.hidden = true;
      }, 250);
    }, 1600);
  });
}
