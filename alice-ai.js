(() => {
  function workerUrl() {
    const url = window.ALICE_IMAGE_WORKER_URL;
    if (!url || !/^https:\/\//i.test(url)) throw new Error("Сервис Алисы не настроен.");
    return url;
  }

  async function post(payload) {
    const response = await fetch(workerUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload)
    });
    let result;
    try { result = await response.json(); }
    catch { throw new Error(`Сервис Алисы вернул некорректный ответ (HTTP ${response.status}).`); }
    if (!response.ok) throw new Error(result.error || `Запрос не выполнен (HTTP ${response.status}).`);
    return result;
  }

  window.askAliceWithGemini = async function (text) {
    const prompt = typeof text === "string" ? text.trim() : "";
    if (!prompt) throw new Error("Напиши вопрос Алисе.");
    const result = await post({ mode: "chat", prompt: prompt.slice(0, 1200) });
    if (typeof result.text !== "string" || !result.text.trim()) throw new Error("Алиса не вернула ответ. Попробуй ещё раз.");
    return result.text.trim();
  };

  window.generateAliceImage = async function (request) {
    const prompt = typeof request === "string" ? request.trim() : "";
    if (!prompt) throw new Error("Опиши, какое изображение нужно создать.");
    const cleanRequest = prompt.replace(/^(?:сгенерируй|генерируй|создай|нарисуй|изобрази|сделай|покажи)\s+(?:мне\s+)?(?:фото|картину|картинку|изображение|иллюстрацию|рисунок)?\s*/i, "").trim() || prompt;
    const result = await post({ mode: "image", prompt: cleanRequest.slice(0, 1200) });
    if (typeof result.imageUrl !== "string" || !result.imageUrl.startsWith("data:image/")) {
      throw new Error("Сервис не вернул изображение.");
    }
    return { imageUrl: result.imageUrl, mimeType: "image/jpeg" };
  };
})();
