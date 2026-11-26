(() => {
  const form = document.getElementById("bison-form");
  const input = document.getElementById("bison-question");
  const answer = document.getElementById("bison-answer");
  if (!form || !input || !answer) return;

  let requestNumber = 0;
  const imageRequest = /(?:сгенерируй|генерируй|создай|нарисуй|изобрази|сделай\s+(?:мне\s+)?(?:фото|картин|изображен|рисунок|иллюстрац)|покажи\s+(?:мне\s+)?(?:фото|картин|изображен|рисунок|иллюстрац))/i;


  async function generateImage(request, number) {
    const artwork = document.getElementById("bison-artwork");
    const artworkImage = document.getElementById("bison-artwork-image");
    try {
      if (typeof window.generateAliceImage !== "function") throw new Error("Генератор изображений не загрузился. Обнови страницу и попробуй ещё раз.");
      answer.textContent = "Алиса создаёт изображение…";
      const result = await window.generateAliceImage(request);
      if (number !== requestNumber) return;
      artworkImage.src = result.imageUrl || result.dataUrl;
      artworkImage.hidden = false;
      artwork?.classList.add("has-image");
      answer.textContent = "Готово — изображение появилось рядом с моделью зубра.";
    } catch (error) {
      if (number !== requestNumber) return;
      answer.dataset.error = "true";
      answer.textContent = error.message || "Не удалось создать изображение. Попробуй уточнить описание.";
    }
  }

  async function askBison(question) {
    const text = question.trim();
    if (!text) return;
    const number = ++requestNumber;
    const submit = form.querySelector("button[type=submit]");
    submit.disabled = true;
    input.disabled = true;
    answer.dataset.error = "false";
    if (imageRequest.test(text)) {
      await generateImage(text, number);
      submit.disabled = false;
      input.disabled = false;
      input.focus();
      return;
    }
    answer.textContent = "Алиса ищет ответ…";
    try {
      if (typeof window.askAliceWithGemini !== "function") throw new Error("ИИ Алиса пока не загрузилась. Обнови страницу и попробуй ещё раз.");
      const prompt = "Answer in Russian as a friendly guide to Belarusian wildlife. The user asks about the European bison (Bison bonasus). Give a brief, simple answer; do not invent facts or exact numbers. If uncertain, say so. Question: " + text;
      const reply = await window.askAliceWithGemini(prompt);
      if (number !== requestNumber) return;
      const response = reply || "Не получилось подготовить ответ. Попробуй спросить иначе.";
      answer.textContent = response;
    } catch (error) {
      if (number !== requestNumber) return;
      answer.dataset.error = "true";
      answer.textContent = error.message || "Не удалось получить ответ ИИ. Проверь подключение к интернету.";
    } finally {
      if (number === requestNumber) {
        submit.disabled = false;
        input.disabled = false;
        input.focus();
      }
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
