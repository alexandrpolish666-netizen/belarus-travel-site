(() => {
  const panel = document.getElementById("guide-panel");
  const toggle = document.getElementById("guide-toggle");
  const collapse = document.getElementById("guide-collapse");
  const message = document.getElementById("guide-message");
  const listen = document.getElementById("guide-listen");
  const avatarUrl = "alisa-avatar.jpg";
  const welcomeAudio = new Audio("audio/alisa-welcome.mp3?v=20261122-greeting-v2");
  const placeAudio = document.getElementById("place-details-audio");
  const detailsModal = document.getElementById("place-details-modal");
  const detailsNarration = detailsModal?.querySelector(".narration");
  let currentPlace = null;
  let currentText = "Привет! Я Алиса, ученица гимназии № 2 города Минска имени О. В. Новицкого и юный гид по Беларуси.";

  const title = document.getElementById("guide-title");
  if (title) title.textContent = "Алиса · Юный гид";
  const subtitle = panel?.querySelector(".guide-panel-head>div span");
  if (subtitle) subtitle.textContent = "Ученица гимназии № 2 города Минска имени О. В. Новицкого · юный гид";
  const toggleLabel = toggle?.querySelector("span");
  if (toggleLabel) toggleLabel.textContent = "Алиса · Юный гид";
  if (message) message.textContent = currentText;
  if (collapse) {
    collapse.textContent = "−";
    collapse.setAttribute("aria-label", "Свернуть гида");
  }

  function makePortrait(className, alt) {
    const image = document.createElement("img");
    image.className = className;
    image.src = avatarUrl;
    image.alt = alt;
    return image;
  }

  panel?.querySelector(".guide-portrait")?.replaceWith(makePortrait("guide-portrait", "Алиса, юный гид по Беларуси"));
  toggle?.querySelector(".guide-toggle-portrait")?.replaceWith(makePortrait("guide-toggle-portrait", ""));

  const cardNote = document.createElement("aside");
  cardNote.className = "guide-card-note";
  cardNote.setAttribute("aria-live", "polite");
  const cardNoteTitle = document.createElement("strong");
  cardNoteTitle.textContent = "Алиса · Юный гид";
  const cardQuote = document.createElement("p");
  cardNote.append(cardNoteTitle, cardQuote);
  document.getElementById("place-details-fact")?.after(cardNote);

  if (detailsNarration) {
    const portrait = document.createElement("div");
    portrait.className = "guide-modal-avatar";
    portrait.setAttribute("role", "img");
    portrait.setAttribute("aria-label", "Алиса рассказывает об этом месте");
    const frame = document.createElement("span");
    frame.className = "guide-modal-portrait-frame";
    frame.append(makePortrait("guide-modal-portrait", ""));
    const name = document.createElement("strong");
    name.textContent = "Алиса";
    const status = document.createElement("span");
    status.className = "guide-speaking-indicator";
    status.setAttribute("aria-hidden", "true");
    status.innerHTML = "<i></i><i></i><i></i>";
    portrait.append(frame, name, status);
    detailsNarration.prepend(portrait);
  }

  const tabMessages = {
    "#map-route": "Я сначала смотрю на карту: так проще понять, как города и памятники связаны дорогами.",
    "#places": "В карточках можно сравнить возраст зданий, материалы стен и форму башен.",
    "#route": "Я стараюсь соединять в маршруте памятники разных эпох.",
    "#collection": "Я собираю заметки о животных Беларуси и местах, связанных с их историями.",
    "#quest": "В квесте я проверяю, что запомнила об архитектуре."
  };

  function setMessage(text, place = null) {
    currentText = text;
    currentPlace = place;
    if (message) message.textContent = text;
    if (listen) listen.textContent = "▶ Послушать рассказ";
    window.speechSynthesis?.cancel();
    welcomeAudio.pause();
    welcomeAudio.currentTime = 0;
  }

  function setExpanded(expanded, focusToggle = false) {
    if (!panel || !toggle) return;
    panel.hidden = !expanded;
    toggle.setAttribute("aria-expanded", String(expanded));
    if (focusToggle) toggle.focus();
  }

  toggle?.addEventListener("click", () => setExpanded(panel.hidden));
  collapse?.addEventListener("click", () => setExpanded(false, true));

  document.querySelectorAll(".links a[href^='#']").forEach(link => {
    link.addEventListener("click", () => {
      const text = tabMessages[link.getAttribute("href")];
      if (text) {
        setMessage(text);
        setExpanded(true);
      }
    });
  });

  const originalShowPlaceDetails = window.showPlaceDetails;
  if (typeof originalShowPlaceDetails === "function") {
    window.showPlaceDetails = function (id) {
      originalShowPlaceDetails(id);
      const audio = document.getElementById("place-details-audio");
      if (audio) { audio.hidden = false; audio.controls = true; }
      document.getElementById("place-details-stop")?.removeAttribute("data-alice-narration");
      const placeTitle = document.getElementById("place-details-title").textContent.trim();
      const meta = document.getElementById("place-details-meta").textContent.trim();
      const fact = document.getElementById("place-details-fact").textContent.trim();
      if (!placeTitle) return;
      const place = { id, name: placeTitle, town: meta.split(" · ")[0] };
      const line = `Я сейчас изучаю ${placeTitle} в городе ${place.town}. ${fact}`;
      setMessage(line, place);
      cardQuote.textContent = line;
    };
  }

  function setSpeaking(isSpeaking) {
    document.querySelector(".guide-modal-avatar")?.classList.toggle("speaking", isSpeaking);
  }
  placeAudio?.addEventListener("play", () => setSpeaking(true));
  placeAudio?.addEventListener("pause", () => setSpeaking(false));
  placeAudio?.addEventListener("ended", () => setSpeaking(false));
  placeAudio?.addEventListener("error", () => setSpeaking(false));

  const chat = document.createElement("section");
  chat.className = "guide-chat";
  chat.setAttribute("aria-label", "Чат с Алисой");
  chat.innerHTML = '<div class="guide-chat-log" role="log" aria-live="polite" aria-relevant="additions"></div><form class="guide-chat-form"><label class="visually-hidden" for="guide-chat-input">Сообщение Алисе</label><input id="guide-chat-input" name="message" maxlength="300" autocomplete="off" placeholder="Например: маршрут Минск — Несвиж" required><button type="submit">Отправить</button></form><button class="guide-chat-voice" type="button" aria-pressed="false">🔊 Озвучивать ответы: выкл.</button><span class="guide-chat-voice-status" aria-live="polite"></span>';
  panel?.append(chat);
  const chatLog = chat.querySelector(".guide-chat-log");
  const chatInput = chat.querySelector("#guide-chat-input");
  const voiceToggle = chat.querySelector(".guide-chat-voice");
  const voiceStatus = chat.querySelector(".guide-chat-voice-status");
  const voiceChannel = "alice";
  let speakReplies = Boolean(window.jarvisVoice?.isEnabled(voiceChannel));
  let pendingImagePrompt = "";

  function renderVoiceToggle() {
    speakReplies = Boolean(window.jarvisVoice?.isEnabled(voiceChannel));
    voiceToggle.setAttribute("aria-pressed", String(speakReplies));
    voiceToggle.textContent = `🔊 Озвучивать ответы: ${speakReplies ? "вкл." : "выкл."}`;
  }
  document.getElementById("place-details-stop")?.addEventListener("click", () => {
    if (document.getElementById("place-details-stop")?.dataset.aliceNarration === "true") {
      window.jarvisVoice?.stop();
      document.getElementById("narrator")?.classList.remove("speaking");
      document.getElementById("place-details-speak").textContent = "▶ Послушать рассказ";
    }
  });
  window.addEventListener("alice-voice-setting", event => {
    if (event.detail?.channel === voiceChannel) renderVoiceToggle();
  });
  renderVoiceToggle();

  function speakChatReply(text) {
    window.jarvisVoice?.speak(text, state => {
      if (!voiceStatus) return;
      voiceStatus.textContent = state === "loading" ? "Готовлю озвучку…" : state === "playing" ? "Алиса озвучивает ответ." : state === "error" ? "Не удалось озвучить ответ." : "";
    }, voiceChannel);
  }

  voiceToggle.addEventListener("click", () => {
    window.jarvisVoice?.setEnabled(!speakReplies, voiceChannel);
  });

  // Keep the composer visible when a phone keyboard reduces the visual viewport.
  const updateMobileChatViewport = () => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const keyboardInset = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
    document.documentElement.style.setProperty("--guide-keyboard-inset", `${keyboardInset}px`);
    document.documentElement.style.setProperty("--guide-visible-height", `${viewport.height}px`);
  };
  updateMobileChatViewport();
  window.visualViewport?.addEventListener("resize", updateMobileChatViewport);
  window.visualViewport?.addEventListener("scroll", updateMobileChatViewport);
  chatInput.addEventListener("focus", () => {
    updateMobileChatViewport();
    requestAnimationFrame(() => chatInput.scrollIntoView({ block: "nearest" }));
  });

  function addChatMessage(role, text, link = "", imageDataUrl = "") {
    const row = document.createElement("div");
    row.className = `guide-chat-message ${role}`;
    const body = document.createElement("p");
    body.textContent = text;
    row.append(body);
    if (link) {
      const source = document.createElement("a");
      source.href = link;
      source.target = "_blank";
      source.rel = "noopener noreferrer";
      source.textContent = "Источник: Википедия";
      row.append(source);
    }
    if (imageDataUrl) {
      const image = document.createElement("img");
      image.src = imageDataUrl;
      image.alt = "Изображение, созданное Алисой";
      image.loading = "lazy";
      image.style.cssText = "display:block;max-width:100%;max-height:420px;margin-top:8px;border-radius:8px";
      if (imageDataUrl.startsWith("blob:")) {
        image.addEventListener("load", () => URL.revokeObjectURL(imageDataUrl), { once: true });
        image.addEventListener("error", () => URL.revokeObjectURL(imageDataUrl), { once: true });
      }
      row.append(image);
    }
    chatLog.append(row);
    chatLog.scrollTop = chatLog.scrollHeight;
    if (role === "alice" && speakReplies && !["Думаю…", "Ищу справку в интернете…"].includes(text)) {
      speakChatReply(text);
    }
  }
  addChatMessage("alice", "Привет! Я могу найти справку о месте, собрать автомобильный маршрут или ответить на вопрос.");

  async function createImage(request, context = "") {
    addChatMessage("alice", "Алиса подбирает сцену и создаёт изображение…");
    const pending = chatLog.lastElementChild;
    try {
      if (typeof window.generateAliceImage !== "function") throw new Error("Генератор изображений не загрузился. Обнови страницу.");
      const result = await window.generateAliceImage(request);
      pending?.remove();
      const artwork = document.getElementById("bison-artwork-image");
      const imageSource = result.imageUrl || result.dataUrl;
      if (artwork) {
        artwork.src = imageSource;
        artwork.hidden = false;
        document.getElementById("bison-artwork")?.classList.add("has-image");
      }
      addChatMessage("alice", "Готово.", "", imageSource);
    } catch (error) {
      pending?.remove();
      addChatMessage("alice", error.message || "Не удалось создать изображение. Попробуй уточнить описание.");
    }
  }

  const normalized = value => value.toLocaleLowerCase("ru-RU").replace(/[ё]/g, "е").replace(/[—–−]/g, "-");
  async function findPlaceInfo(query) {
    const url = new URL("https://ru.wikipedia.org/w/api.php");
    url.search = new URLSearchParams({ action: "query", list: "search", srsearch: query, format: "json", origin: "*", utf8: "1", srlimit: "3" });
    const response = await fetch(url, { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error("Поиск сейчас недоступен.");
    const data = await response.json();
    const result = data.query?.search?.[0];
    if (!result) return null;
    const page = await fetch(`https://ru.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(result.title.replace(/ /g, "_"))}`, { headers: { Accept: "application/json" } });
    if (!page.ok) return { title: result.title, text: result.snippet?.replace(/<[^>]+>/g, " ").replace(/&quot;/g, '"').replace(/&#039;/g, "'") || "Нашлась статья, но её краткая справка сейчас недоступна.", url: `https://ru.wikipedia.org/wiki/${encodeURIComponent(result.title.replace(/ /g, "_"))}` };
    const summary = await page.json();
    return { title: summary.title || result.title, text: summary.extract || result.snippet || "Краткая справка для этой статьи не найдена.", url: summary.content_urls?.desktop?.page || `https://ru.wikipedia.org/wiki/${encodeURIComponent(result.title.replace(/ /g, "_"))}` };
  }

  function handleRouteRequest(text) {
    if (!/маршрут|постро|проложи|дорог/i.test(text) || typeof buildings === "undefined") return false;
    const source = document.getElementById("route-origin");
    const places = buildings.map(place => ({
      id: place.id,
      keys: [place.name, place.town].filter(Boolean).map(normalized)
    }));
    const matches = [];
    places.forEach(place => place.keys.forEach(key => {
      if (key.length < 4) return;
      const position = normalized(text).indexOf(key);
      if (position >= 0 && !matches.some(match => match.id === place.id)) matches.push({ id: place.id, position });
    }));
    matches.sort((a, b) => a.position - b.position);
    if (!matches.length) {
      addChatMessage("alice", "Назови города или места из раздела «Карта», например: «Построй маршрут Минск — Несвиж».");
      return true;
    }
    const requested = matches.slice(0, 2);
    if (requested.length >= 2) source.value = requested[0].id;
    else if (/от\s+моего|от\s+меня|мое местоположение|моё местоположение/i.test(text)) source.value = "me";
    if (typeof routeStops !== "undefined") routeStops.splice(0, routeStops.length);
    if (typeof clearBuiltRoute === "function") clearBuiltRoute();
    if (typeof renderRouteStops === "function") renderRouteStops();
    const destination = requested.length >= 2 ? requested[1].id : requested[0].id;
    if (typeof addStop === "function") addStop(destination);
    document.getElementById("map-route")?.scrollIntoView({ behavior: "smooth", block: "start" });
    if (typeof buildRoute === "function") buildRoute();
    const labels = requested.map(item => buildings.find(place => place.id === item.id)?.name).filter(Boolean);
    addChatMessage("alice", labels.length > 1
      ? `Добавила маршрут «${labels[0]} — ${labels[1]}» на карту. Если карта готова, путь уже строится; иначе воспользуйся ссылкой на Яндекс Карты в блоке маршрута.`
      : `Добавила «${labels[0]}» как пункт маршрута. Выбери начало пути в блоке карты и нажми «Построить маршрут».`);
    return true;
  }

  async function answerPrompt(text) {
    const affirmative = /^(да|ага|конечно|хочу|давай|покажи|показывай|сгенерируй|генерируй|нарисуй)(?:[!.?, ]|$)/i.test(text.trim());
    const negative = /^(нет|не надо|не хочу|отмена|потом)[!.?, ]*$/i.test(text.trim());
    if (pendingImagePrompt && affirmative) {
      const request = pendingImagePrompt.request;
      const context = pendingImagePrompt.context;
      pendingImagePrompt = "";
      await createImage(request, context);
      return;
    }
    if (pendingImagePrompt && negative) {
      pendingImagePrompt = "";
      addChatMessage("alice", "Хорошо, изображение не создаю.");
      return;
    }
    if (pendingImagePrompt) pendingImagePrompt = "";
    if (/сгенерируй|создай\s+(картин|изображен|рисунок|иллюстрац)|сделай\s+(мне\s+)?(картин|изображен|рисунок|иллюстрац)|нарисуй|изобрази|покажи\s+(мне\s+)?(картин|изображен)|хочу\s+увидеть/i.test(text)) {
      pendingImagePrompt = "";
      await createImage(text, currentText);
      return;
    }
    if (/^(привет|здравствуй|добрый день|доброе утро|добрый вечер|как дела|кто ты)[!.? ]*$/i.test(text.trim())) {
      addChatMessage("alice", /как дела/i.test(text) ? "Неплохо. Карта на месте, исторические здания тоже." : "Привет! Могу найти справку о месте или помочь собрать маршрут по Беларуси.");
      return;
    }
    if (handleRouteRequest(text)) return;
    const local = typeof buildings === "undefined" ? null : buildings.find(place => [place.name, place.town].filter(Boolean).some(key => normalized(text).includes(normalized(key))));
    const placeQuestion = local || /расскажи|найди|поищи|что ты знаешь|что интересного|дай информацию|дополнительная информация|справк/i.test(text);
    if (!placeQuestion && typeof window.askAliceWithGemini === "function") {
      addChatMessage("alice", "Думаю…");
      try {
        const reply = await window.askAliceWithGemini(text);
        chatLog.lastElementChild?.remove();
        if (/хочешь.{0,60}(увидеть|посмотреть|картин|изображен)|хотела бы.{0,40}(показать|сгенерировать)/i.test(reply || "")) {
          pendingImagePrompt = { request: text, context: reply };
        }
        addChatMessage("alice", reply || "Не получилось подготовить ответ. Попробуй переформулировать.");
      } catch (error) {
        chatLog.lastElementChild?.remove();
        addChatMessage("alice", error.message || "Could not contact Gemini. Check Firebase and App Check settings.");
      }
      return;
    }
    const query = local ? `${local.name} ${local.town}` : text.replace(/^(расскажи|найди|поищи|что ты знаешь|что интересного|дай информацию|дополнительная информация)\s*(об|про|о|по)?\s*/i, "").trim();
    addChatMessage("alice", "Ищу справку в интернете…");
    try {
      const result = await findPlaceInfo(query);
      const pending = chatLog.lastElementChild;
      pending?.remove();
      if (result) addChatMessage("alice", `${result.title}. ${result.text}`, result.url);
      else if (local) addChatMessage("alice", `${local.name} — ${local.fact} ${local.magic || ""}`.trim());
      else addChatMessage("alice", "Не нашла подходящую статью. Попробуй указать название места точнее.");
    } catch (error) {
      chatLog.lastElementChild?.remove();
      if (local) addChatMessage("alice", `${local.name} — ${local.fact} ${local.magic || ""}`.trim());
      else addChatMessage("alice", "Не удалось связаться с онлайн-справочником. Проверь интернет и попробуй ещё раз.");
    }
  }
  chat.querySelector(".guide-chat-form").addEventListener("submit", event => {
    event.preventDefault();
    const text = chatInput.value.trim();
    if (!text) return;
    addChatMessage("user", text);
    chatInput.value = "";
    answerPrompt(text);
  });

  welcomeAudio.addEventListener("play", () => { if (listen) listen.textContent = "Ⅱ Пауза"; });
  welcomeAudio.addEventListener("pause", () => { if (listen && !currentPlace) listen.textContent = "▶ Послушать рассказ"; });
  welcomeAudio.addEventListener("ended", () => { if (listen) listen.textContent = "▶ Послушать рассказ"; });
  listen?.addEventListener("click", async () => {
    if (currentPlace && placeAudio) {
      if (detailsModal?.hidden && typeof window.showPlaceDetails === "function") window.showPlaceDetails(currentPlace.id);
      const button = document.getElementById("place-details-speak");
      if (placeAudio.paused && button) button.click();
      else if (!placeAudio.paused) placeAudio.pause();
      return;
    }
    if (currentText.startsWith("Привет!") && welcomeAudio.src) {
      if (!welcomeAudio.paused) { welcomeAudio.pause(); return; }
      try { await welcomeAudio.play(); } catch { listen.textContent = "Не удалось включить запись"; }
      return;
    }
    if (window.jarvisVoice?.isPlaying()) { window.jarvisVoice.stop(); listen.textContent = "▶ Послушать рассказ"; return; }
    window.jarvisVoice?.speak(currentText, state => {
      if (state === "playing") listen.textContent = "Ⅱ Пауза";
      if (state === "ended" || state === "error") listen.textContent = "▶ Послушать рассказ";
    });
  });
})();
