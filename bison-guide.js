(() => {
  const form = document.getElementById("bison-form");
  const input = document.getElementById("bison-question");
  const answer = document.getElementById("bison-answer");
  const voiceToggle = document.getElementById("bison-voice-toggle");
  if (!form || !input || !answer) return;

  const voiceChannel = "bison";
  let speakAnswers = Boolean(window.jarvisVoice?.isEnabled(voiceChannel));

  function renderVoiceToggle() {
    if (!voiceToggle) return;
    speakAnswers = Boolean(window.jarvisVoice?.isEnabled(voiceChannel));
    voiceToggle.setAttribute("aria-pressed", String(speakAnswers));
    voiceToggle.textContent = "🔊 Озвучивать ответы: " + (speakAnswers ? "вкл." : "выкл.");
  }
  window.addEventListener("alice-voice-setting", event => {
    if (event.detail?.channel === voiceChannel) renderVoiceToggle();
  });
  renderVoiceToggle();

  function speak(text) {
    window.jarvisVoice?.speak(text, state => {
      const status = document.getElementById("bison-voice-status");
      if (status) status.textContent = state === "loading" ? "Готовлю озвучку…" : state === "playing" ? "Алиса озвучивает ответ." : state === "error" ? "Не удалось озвучить ответ." : "";
    }, voiceChannel);
  }

  voiceToggle?.addEventListener("click", () => {
    speakAnswers = !speakAnswers;
    window.jarvisVoice?.setEnabled(speakAnswers, voiceChannel);
  });

  async function askBison(question) {
    const text = question.trim();
    if (!text) return;
    const submit = form.querySelector("button[type=submit]");
    submit.disabled = true;
    input.disabled = true;
    answer.dataset.error = "false";
    answer.textContent = "\u0410\u043b\u0438\u0441\u0430 \u0438\u0449\u0435\u0442 \u043e\u0442\u0432\u0435\u0442\u2026";
    try {
      if (typeof window.askAliceWithGemini !== "function") throw new Error("\u0418\u0418 \u0410\u043b\u0438\u0441\u0430 \u043f\u043e\u043a\u0430 \u043d\u0435 \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u043b\u0430\u0441\u044c. \u041e\u0431\u043d\u043e\u0432\u0438 \u0441\u0442\u0440\u0430\u043d\u0438\u0446\u0443 \u0438 \u043f\u043e\u043f\u0440\u043e\u0431\u0443\u0439 \u0435\u0449\u0451 \u0440\u0430\u0437.");
      const prompt = "Answer in Russian as a friendly guide to Belarusian wildlife. The user asks about the European bison (Bison bonasus). Give a brief, simple answer; do not invent facts or exact numbers. If uncertain, say so. Question: " + text;
      const reply = await window.askAliceWithGemini(prompt);
      const response = reply || "\u041d\u0435 \u043f\u043e\u043b\u0443\u0447\u0438\u043b\u043e\u0441\u044c \u043f\u043e\u0434\u0433\u043e\u0442\u043e\u0432\u0438\u0442\u044c \u043e\u0442\u0432\u0435\u0442. \u041f\u043e\u043f\u0440\u043e\u0431\u0443\u0439 \u0441\u043f\u0440\u043e\u0441\u0438\u0442\u044c \u0438\u043d\u0430\u0447\u0435.";
      answer.textContent = response;
      if (speakAnswers) speak(response);
    } catch (error) {
      answer.dataset.error = "true";
      answer.textContent = error.message || "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043f\u043e\u043b\u0443\u0447\u0438\u0442\u044c \u043e\u0442\u0432\u0435\u0442 \u0418\u0418. \u041f\u0440\u043e\u0432\u0435\u0440\u044c \u043f\u043e\u0434\u043a\u043b\u044e\u0447\u0435\u043d\u0438\u0435 \u043a \u0438\u043d\u0442\u0435\u0440\u043d\u0435\u0442\u0443.";
    } finally {
      submit.disabled = false;
      input.disabled = false;
      input.focus();
    }
  }

  form.addEventListener("submit", event => {
    event.preventDefault();
    const question = input.value;
    input.value = "";
    askBison(question);
  });

  document.querySelectorAll("[data-bison-prompt]").forEach(button => {
    button.addEventListener("click", () => askBison(button.dataset.bisonPrompt));
  });
})();
