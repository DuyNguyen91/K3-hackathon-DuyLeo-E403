// Single-page prototype interactions for PDF viewer and chatbot flow.
document.addEventListener("DOMContentLoaded", () => {
  const pdfInput = document.getElementById("pdfInput");
  const pdfFrame = document.getElementById("pdfFrame");
  const viewerStage = document.getElementById("viewerStage");
  const fileStatus = document.getElementById("fileStatus");
  const chatbotToggle = document.getElementById("chatbotToggle");
  const chatbotDrawer = document.getElementById("chatbotDrawer");
  const closeDrawer = document.getElementById("closeDrawer");
  const continueToChat = document.getElementById("continueToChat");
  const sendQuestion = document.getElementById("sendQuestion");
  const loadingState = document.getElementById("loadingState");
  const goToNote = document.getElementById("goToNote");
  const saveNote = document.getElementById("saveNote");
  const finishFlow = document.getElementById("finishFlow");
  const restartFlow = document.getElementById("restartFlow");
  const toast = document.getElementById("toast");
  const steps = Array.from(document.querySelectorAll(".chatbot-step"));
  const tabs = Array.from(document.querySelectorAll(".tab"));
  const btnExplainTop = document.getElementById("btnExplainTop");
  const btnSummaryTop = document.getElementById("btnSummaryTop");
  const btnPagesTop = document.getElementById("btnPagesTop");
  const createQuizInline = document.getElementById("createQuizInline");
  const createQuizResult = document.getElementById("createQuizResult");
  const noteContent = document.getElementById("noteContent");

  if (pdfInput) {
    pdfInput.addEventListener("change", (event) => {
      const file = event.target.files?.[0];
      if (!file) return;

      fileStatus.textContent = file.name;
      const objectUrl = URL.createObjectURL(file);
      pdfFrame.hidden = false;
      pdfFrame.src = objectUrl;
      viewerStage.querySelector(".viewer-placeholder")?.remove();
      pdfFrame.style.display = "block";
      pdfFrame.style.width = "100%";
      pdfFrame.style.height = "100%";
      pdfFrame.style.minHeight = "520px";
    });
  }

  if (chatbotToggle && chatbotDrawer) {
    chatbotToggle.addEventListener("click", () => {
      chatbotDrawer.hidden = false;
      chatbotDrawer.classList.add("open");
    });
  }

  if (closeDrawer) {
    closeDrawer.addEventListener("click", () => {
      chatbotDrawer.hidden = true;
      chatbotDrawer.classList.remove("open");
    });
  }

  function showStep(stepId) {
    steps.forEach((step) => step.classList.remove("active"));
    const target = document.getElementById(stepId);
    if (target) target.classList.add("active");
  }

  if (continueToChat) {
    continueToChat.addEventListener("click", () => showStep("stepChat"));
  }

  let lastResponse = null;
  if (sendQuestion) {
    sendQuestion.addEventListener("click", () => {
      const input = document.getElementById("questionInput");
      const thread = document.getElementById("singleChatThread");
      if (!input || !thread) return;

      const bubble = document.createElement("div");
      bubble.className = "message user-message";
      bubble.innerHTML = `<div class="message-bubble user-bubble"><p>${input.value || "Explain this paragraph in simple words."}</p></div>`;
      thread.appendChild(bubble);

      loadingState.hidden = false;
      setTimeout(() => {
        loadingState.hidden = true;
        const reply = document.createElement("div");
        reply.className = "message ai-message";
        reply.innerHTML = `<div class="avatar">V</div><div class="message-bubble"><p>${response.answer}</p></div>`;
        thread.appendChild(reply);
        lastResponse = response;
        document.getElementById("answerText").innerHTML = `<p><strong>Giải thích:</strong></p><p>${response.answer}</p>`;
        document.getElementById("summaryList").innerHTML = response.summary.map((item) => `<li>${item}</li>`).join("");
        document.getElementById("sourceList").innerHTML = response.sources.map((source) => `<div class="source-card"><h4>${source.title}</h4><p>${source.page}</p><p>${source.confidence}</p></div>`).join("");
        if (noteContent) noteContent.value = response.answer;
        showStep("stepResult");
      }, 1200);

      input.value = "";
    });
  }

  const createNoteBtn = document.getElementById("createNoteFromSegment");
  if (createNoteBtn) {
    createNoteBtn.addEventListener("click", () => {
      if (noteContent && lastResponse) noteContent.value = lastResponse.answer;
      showStep("stepNote");
    });
  }

  if (goToNote) {
    goToNote.addEventListener("click", () => showStep("stepNote"));
  }

  if (saveNote) {
    saveNote.addEventListener("click", () => {
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

  if (finishFlow) {
    finishFlow.addEventListener("click", () => showStep("stepFinish"));
  }

  if (restartFlow) {
    restartFlow.addEventListener("click", () => showStep("stepUpload"));
  }

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((item) => item.classList.remove("active"));
      tab.classList.add("active");
      const target = tab.dataset.tab;
      document.querySelectorAll(".tab-panel").forEach((panel) => {
        panel.hidden = panel.id !== `panel${target[0].toUpperCase()}${target.slice(1)}`;
      });
    });
  });

  function activatePanel(name) {
    // ensure result step visible
    showStep("stepResult");
    tabs.forEach((t) => t.classList.remove("active"));
    const wanted = Array.from(tabs).find((t) => t.dataset.tab === name);
    if (wanted) wanted.classList.add("active");
    document.querySelectorAll(".tab-panel").forEach((panel) => {
      panel.hidden = panel.id !== `panel${name[0].toUpperCase()}${name.slice(1)}`;
    });
  }

  if (btnExplainTop) btnExplainTop.addEventListener("click", () => activatePanel("explain"));
  if (btnSummaryTop) btnSummaryTop.addEventListener("click", () => activatePanel("summary"));
  if (btnPagesTop) btnPagesTop.addEventListener("click", () => activatePanel("sources"));

  // Quiz flow
  let quizIndex = 0;
  function renderQuiz() {
    const container = document.getElementById("quizContainer");
    const qEl = document.getElementById("quizQuestion");
    const optsEl = document.getElementById("quizOptions");
    if (!lastResponse || !lastResponse.quiz || lastResponse.quiz.length === 0) {
      qEl.textContent = "Không có câu hỏi quiz sẵn có.";
      optsEl.innerHTML = "";
      return;
    }
    const q = lastResponse.quiz[quizIndex];
    qEl.innerHTML = `<p><strong>${quizIndex + 1}. ${q.question}</strong></p>`;
    optsEl.innerHTML = q.options.map((opt, i) => `<div class=\"option-item\"><label><input type=\"radio\" name=\"quizOpt\" value=\"${i}\"> ${opt}</label></div>`).join("");
  }

  const prevQuiz = document.getElementById("prevQuiz");
  const nextQuiz = document.getElementById("nextQuiz");

  if (createQuizInline) {
    createQuizInline.addEventListener("click", () => {
      quizIndex = 0;
      renderQuiz();
      showStep("stepQuiz");
    });
  }
  if (createQuizResult) {
    createQuizResult.addEventListener("click", () => {
      quizIndex = 0;
      renderQuiz();
      showStep("stepQuiz");
    });
  }

  if (prevQuiz) prevQuiz.addEventListener("click", () => {
    if (quizIndex > 0) quizIndex -= 1;
    renderQuiz();
  });
  if (nextQuiz) nextQuiz.addEventListener("click", () => {
    if (!lastResponse || !lastResponse.quiz) return;
    if (quizIndex < lastResponse.quiz.length - 1) {
      quizIndex += 1;
      renderQuiz();
    } else {
      showStep("stepResult");
    }
  });
});
