(() => {
  let chatPromise;

  async function createChat() {
    const config = window.JARVIS_FIREBASE_CONFIG;
    const isLocalhost = ["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname);
    const isPlaceholder = value => !value || value.startsWith("\u0412\u0421\u0422\u0410\u0412\u042c\u0422\u0415_");

    if (!config || isPlaceholder(config.apiKey) || isPlaceholder(config.projectId) || isPlaceholder(config.appId)) {
      throw new Error("\u041f\u0440\u043e\u0432\u0435\u0440\u044c \u043f\u0443\u0431\u043b\u0438\u0447\u043d\u044b\u0435 \u043f\u0430\u0440\u0430\u043c\u0435\u0442\u0440\u044b Firebase \u0432 firebase-config.js.");
    }
    if (!isLocalhost && isPlaceholder(config.appCheckSiteKey)) {
      throw new Error("\u0414\u043b\u044f \u043e\u043f\u0443\u0431\u043b\u0438\u043a\u043e\u0432\u0430\u043d\u043d\u043e\u0433\u043e \u0441\u0430\u0439\u0442\u0430 \u0434\u043e\u0431\u0430\u0432\u044c production site key reCAPTCHA Enterprise \u0432 firebase-config.js.");
    }

    // Debug mode is limited to localhost; production requires a real reCAPTCHA site key.
    if (isLocalhost) {
      self.FIREBASE_APPCHECK_DEBUG_TOKEN = "A1518504-4FE0-453E-813A-6D6CA56309FC";
    }

    const version = "13.4.0";
    const cdn = `https://www.gstatic.com/firebasejs/${version}`;
    const [{ initializeApp }, { initializeAppCheck, ReCaptchaEnterpriseProvider }, { getAI, getGenerativeModel, GoogleAIBackend }] = await Promise.all([
      import(`${cdn}/firebase-app.js`),
      import(`${cdn}/firebase-app-check.js`),
      import(`${cdn}/firebase-ai.js`)
    ]);

    const app = initializeApp({
      apiKey: config.apiKey,
      authDomain: config.authDomain,
      projectId: config.projectId,
      appId: config.appId
    });
    const appCheckSiteKey = isPlaceholder(config.appCheckSiteKey)
      ? "local-debug-provider"
      : config.appCheckSiteKey;
    initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider(appCheckSiteKey),
      isTokenAutoRefreshEnabled: true
    });

    const ai = getAI(app, { backend: new GoogleAIBackend() });
    const systemInstruction = "\u0422\u044b \u0410\u043b\u0438\u0441\u0430, \u0434\u0440\u0443\u0436\u0435\u043b\u044e\u0431\u043d\u044b\u0439 \u044e\u043d\u044b\u0439 \u0433\u0438\u0434 \u043f\u043e \u0411\u0435\u043b\u0430\u0440\u0443\u0441\u0438. \u041e\u0442\u0432\u0435\u0447\u0430\u0439 \u043f\u043e-\u0440\u0443\u0441\u0441\u043a\u0438, \u043a\u0440\u0430\u0442\u043a\u043e \u0438 \u043f\u043e\u043d\u044f\u0442\u043d\u043e. \u041f\u043e\u043c\u043e\u0433\u0430\u0439 \u0443\u0437\u043d\u0430\u0432\u0430\u0442\u044c \u043e \u043c\u0435\u0441\u0442\u0430\u0445 \u0411\u0435\u043b\u0430\u0440\u0443\u0441\u0438 \u0438 \u043f\u043e\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u0439 \u043e\u0431\u044b\u0447\u043d\u044b\u0439 \u0440\u0430\u0437\u0433\u043e\u0432\u043e\u0440. \u041d\u0435 \u0443\u0442\u0432\u0435\u0440\u0436\u0434\u0430\u0439, \u0447\u0442\u043e \u043f\u043e\u0441\u0442\u0440\u043e\u0438\u043b\u0430 \u043c\u0430\u0440\u0448\u0440\u0443\u0442 \u043d\u0430 \u043a\u0430\u0440\u0442\u0435: \u043c\u0430\u0440\u0448\u0440\u0443\u0442\u044b \u0441\u043e\u0437\u0434\u0430\u0451\u0442 \u043e\u0442\u0434\u0435\u043b\u044c\u043d\u0430\u044f \u0444\u0443\u043d\u043a\u0446\u0438\u044f \u0441\u0430\u0439\u0442\u0430. \u0415\u0441\u043b\u0438 \u043d\u0435 \u0443\u0432\u0435\u0440\u0435\u043d\u0430 \u0432 \u0444\u0430\u043a\u0442\u0435, \u0441\u043a\u0430\u0436\u0438 \u043e\u0431 \u044d\u0442\u043e\u043c.";
    // The guide mostly handles simple questions. Prefer the faster Flash-Lite
    // model and keep responses short; use Flash only if Lite fails.
    const generationConfig = {
      maxOutputTokens: 256,
      thinkingConfig: { thinkingLevel: "MINIMAL" }
    };
    const primaryModel = getGenerativeModel(ai, {
      model: "gemini-3.5-flash-lite",
      systemInstruction,
      generationConfig
    });
    const fallbackModel = getGenerativeModel(ai, {
      model: "gemini-3.8-flash",
      systemInstruction,
      generationConfig: {
        maxOutputTokens: 256,
        thinkingConfig: { thinkingLevel: "LOW" }
      }
    });
    return { primary: primaryModel.startChat(), fallback: fallbackModel.startChat() };
  }

  window.askAliceWithGemini = async function (text) {
    chatPromise ||= createChat();
    try {
      const chats = await chatPromise;
      try {
        const result = await chats.primary.sendMessage(text);
        return result.response.text();
      } catch (primaryError) {
        try {
          const result = await chats.fallback.sendMessage(text);
          return result.response.text();
        } catch (fallbackError) {
          const primaryMessage = primaryError?.message || "неизвестная ошибка";
          const fallbackMessage = fallbackError?.message || "неизвестная ошибка";
          throw new Error(`Основная и запасная модели ИИ не ответили. Основная: ${primaryMessage}. Запасная: ${fallbackMessage}`);
        }
      }
    } catch (error) {
      chatPromise = null;
      throw error;
    }
  };

  window.generateAliceImage = async function (request, context = "") {
    const prompt = typeof request === "string" ? request.trim() : "";
    if (!prompt) {
      throw new Error("Describe the picture you want to create.");
    }
    // Keep image generation independent from Firebase and billing. Alice builds
    // a usable visual prompt locally from the request and the current dialogue.
    const visualPrompt = [
      `Main subject and requested details: ${prompt}`,
      context ? `Scene context: ${context}` : "",
      "Create one polished, visually coherent illustration. Preserve the requested subject, setting, and details. Use a clear composition, a suitable camera angle, a fitting background, balanced colors, and detailed natural lighting. Do not add text, watermarks, or logos."
    ].filter(Boolean).join(" ");
    const api = window.ALICE_IMAGE_WORKER_URL;
    if (!api || !/^https:\/\//i.test(api)) {
      throw new Error("Генератор изображений не настроен. Укажи адрес опубликованного Cloudflare Worker в image-config.js.");
    }
    const imagePrompt = `${visualPrompt}\n\nHigh quality, coherent composition, clear subject, detailed lighting. No text, watermark, or logo.`.slice(0, 1800);
    const response = await fetch(api, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ prompt: imagePrompt })
    });
    let result;
    try { result = await response.json(); }
    catch { throw new Error(`Cloudflare Worker вернул некорректный ответ (HTTP ${response.status}).`); }
    if (!response.ok) throw new Error(result.error || `Ошибка генерации (HTTP ${response.status}).`);
    if (typeof result.imageUrl !== "string" || !result.imageUrl.startsWith("data:image/")) {
      throw new Error("Cloudflare Worker не вернул изображение.");
    }
    return { imageUrl: result.imageUrl, mimeType: "image/jpeg" };
  };
})();
