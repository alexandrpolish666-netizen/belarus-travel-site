(() => {
  let run = 0;
  let activeAudio = null;
  let activeAudioUrl = "";
  let activeRequest = null;
  let activeChannel = null;
  const legacyKey = "alice-speak-replies";
  const aliceKey = "alice-speak-replies-alice-v2";
  if (localStorage.getItem(aliceKey) === null) localStorage.setItem(aliceKey, "true");
  localStorage.removeItem(legacyKey);
  const enabled = {
    alice: localStorage.getItem(aliceKey) === "true",
    bison: localStorage.getItem("alice-speak-replies-bison") === "true"
  };

  function stop() {
    run++;
    activeChannel = null;
    activeRequest?.abort();
    activeRequest = null;
    if (activeAudio) {
      activeAudio.pause();
      activeAudio.removeAttribute("src");
      activeAudio.load();
      activeAudio = null;
    }
    if (activeAudioUrl) URL.revokeObjectURL(activeAudioUrl);
    activeAudioUrl = "";
    window.speechSynthesis?.cancel();
  }

  function speak(text, onState = () => {}, channel = "alice") {
    stop();
    const currentRun = run;
    activeChannel = channel;
    const clean = String(text || "").replace(/https?:\/\/\S+/gi, "").replace(/\s+/g, " ").trim().slice(0, 3000);
    if (!clean) { activeChannel = null; onState("ended"); return; }
    const workerUrl = window.ALICE_IMAGE_WORKER_URL;
    if (!workerUrl || !/^https:\/\//i.test(workerUrl)) {
      activeChannel = null;
      onState("error", new Error("Адрес сервиса озвучки не настроен."));
      return;
    }

    const controller = new AbortController();
    activeRequest = controller;
    onState("loading");
    fetch(workerUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "audio/mpeg" },
      body: JSON.stringify({ mode: "tts", text: clean }),
      signal: controller.signal
    }).then(async response => {
      if (!response.ok) {
        let message = `Сервис озвучки вернул ошибку (HTTP ${response.status}).`;
        try { message = (await response.json()).error || message; } catch {}
        throw new Error(message);
      }
      const type = response.headers.get("Content-Type") || "";
      if (!type.toLowerCase().startsWith("audio/")) throw new Error("Сервис озвучки вернул ответ без аудио.");
      return response.blob();
    }).then(blob => {
      if (currentRun !== run) return;
      activeRequest = null;
      activeAudioUrl = URL.createObjectURL(blob);
      activeAudio = new Audio(activeAudioUrl);
      activeAudio.onplaying = () => { if (currentRun === run) onState("playing"); };
      activeAudio.onended = () => {
        if (currentRun !== run) return;
        activeAudio = null;
        activeChannel = null;
        URL.revokeObjectURL(activeAudioUrl);
        activeAudioUrl = "";
        onState("ended");
      };
      activeAudio.onerror = () => {
        if (currentRun !== run) return;
        activeAudio = null;
        activeChannel = null;
        if (activeAudioUrl) URL.revokeObjectURL(activeAudioUrl);
        activeAudioUrl = "";
        onState("error", new Error("Не удалось воспроизвести аудио."));
      };
      activeAudio.play().catch(error => {
        if (currentRun !== run) return;
        activeAudio = null;
        activeChannel = null;
        if (activeAudioUrl) URL.revokeObjectURL(activeAudioUrl);
        activeAudioUrl = "";
        onState("error", error);
      });
    }).catch(error => {
      if (currentRun !== run || error.name === "AbortError") return;
      activeRequest = null;
      activeChannel = null;
      onState("error", error);
    });
  }

  function setEnabled(value, channel = "alice") {
    if (!(channel in enabled)) return;
    enabled[channel] = Boolean(value);
    localStorage.setItem(`alice-speak-replies-${channel}`, String(enabled[channel]));
    window.dispatchEvent(new CustomEvent("alice-voice-setting", { detail: { channel, enabled: enabled[channel] } }));
    if (!enabled[channel] && activeChannel === channel) stop();
  }

  window.jarvisVoice = {
    speak,
    stop,
    isPlaying: (channel = "") => Boolean(activeRequest || activeAudio && !activeAudio.paused) && (!channel || activeChannel === channel),
    isEnabled: (channel = "alice") => Boolean(enabled[channel]),
    setEnabled
  };
})();
