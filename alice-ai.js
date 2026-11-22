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
    const cleanRequest = prompt.replace(/^(?:сгенерируй|сгенерировать|нарисуй|изобрази|создай|покажи)\s+(?:мне\s+)?(?:картину|картинку|изображение|иллюстрацию|рисунок)?\s*/i, "").trim() || prompt;
    const isBison = /(?:^|[^а-яё])(?:зубр|бизон)[а-яё]*(?:$|[^а-яё])/iu.test(cleanRequest);
    const subject = isBison ? "a European bison (Bison bonasus)" : cleanRequest;
    const imagePrompt = [
      `The exact main subject is ${subject}. Follow the user's requested subject and details literally.`,
      cleanRequest !== subject && !isBison ? `Additional requested details: ${cleanRequest}` : "",
      "Create one polished illustration. Keep the requested subject large, recognizable, and central. Do not replace it with a person, portrait, or unrelated scene. Add no person unless the user explicitly requested one. Use a fitting background and natural colors. No text, watermark, or logo."
    ].filter(Boolean).join(" ").slice(0, 1800);
    const result = await post({ mode: "image", prompt: imagePrompt });
    if (typeof result.imageUrl !== "string" || !result.imageUrl.startsWith("data:image/")) {
      throw new Error("Сервис не вернул изображение.");
    }
    return { imageUrl: result.imageUrl, mimeType: "image/jpeg" };
  };
})();
