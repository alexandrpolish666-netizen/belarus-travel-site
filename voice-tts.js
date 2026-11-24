(() => {
  let run = 0;
  let activeUtterance = null;
  let activeChannel = null;
  let activeAudio = null;
  let activeAudioUrl = "";
  let activeRequest = null;
  const legacyKey = "alice-speak-replies";
  const legacyEnabled = localStorage.getItem(legacyKey) === "true";
  const aliceKey = "alice-speak-replies-alice";
  if (localStorage.getItem(aliceKey) === null) localStorage.setItem(aliceKey, String(legacyEnabled));
  localStorage.removeItem(legacyKey);
  const enabled = {
    alice: localStorage.getItem(aliceKey) === "true",
    bison: localStorage.getItem("alice-speak-replies-bison") === "true"
  };

  function stop() {
    run++;
    activeUtterance = null;
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

  function availableVoices() {
    const current = window.speechSynthesis?.getVoices() || [];
    if (current.length) return Promise.resolve(current);
    return new Promise(resolve => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        window.speechSynthesis?.removeEventListener?.("voiceschanged", finish);
        resolve(window.speechSynthesis?.getVoices() || []);
      };
      const timer = setTimeout(finish, 1200);
      window.speechSynthesis?.addEventListener?.("voiceschanged", finish, { once: true });
    });
  }

  function selectRussianVoice(voices) {
    const russian = voices.filter(voice => /^ru(?:-|$)/i.test(voice.lang));
    const preferred = /svetlana|irina|daria|darina|arina|alena|elena|ekaterina|katya|yulia|julia|olga|milena|tatyana|vera|polina|marina|natalia|female/i;
    const masculine = /(^|[\s_-])male\b|dmitry|dmitriy|ivan|alexander|andrey|andrei|pavel|sergey|nikolay/i;
    return russian.sort((a, b) => {
      const score = voice => (preferred.test(voice.name) ? 10 : 0)
        + (/natural|neural|online/i.test(voice.name) ? 100 : 0)
        + (/^ru-RU$/i.test(voice.lang) ? 1 : 0)
        - (masculine.test(voice.name) ? 20 : 0);
      return score(b) - score(a);
    })[0] || null;
  }

  async function speakWithAliceVoice(text, currentRun, onState) {
    const controller = new AbortController();
    activeRequest = controller;
    try {
      const response = await fetch(window.ALICE_IMAGE_WORKER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "audio/mpeg" },
        body: JSON.stringify({ mode: "tts", text }),
        signal: controller.signal
      });
      if (!response.ok) throw new Error(`TTS HTTP ${response.status}`);
      const blob = await response.blob();
      if (currentRun !== run) return true;
      if (!blob.size || !/^audio\//i.test(blob.type)) throw new Error("Некорректный формат аудио");
      activeAudioUrl = URL.createObjectURL(blob);
      const audio = new Audio(activeAudioUrl);
      activeAudio = audio;
      audio.onplay = () => { if (currentRun === run) onState("playing"); };
      audio.onended = () => {
        if (currentRun !== run) return;
        activeAudio = null;
        activeChannel = null;
        URL.revokeObjectURL(activeAudioUrl);
        activeAudioUrl = "";
        onState("ended");
      };
      audio.onerror = () => {
        if (currentRun !== run) return;
        activeAudio = null;
        activeChannel = null;
        onState("error", new Error("Не удалось воспроизвести аудио."));
      };
      await audio.play();
      return true;
    } catch (error) {
      if (currentRun !== run || error.name === "AbortError") return true;
      activeRequest = null;
      activeAudio = null;
      return false;
    }
  }

  function speak(text, onState = () => {}, channel = "alice") {
    stop();
    const currentRun = run;
    activeChannel = channel;
    const clean = String(text || "").replace(/https?:\/\/\S+/gi, "").replace(/\s+/g, " ").trim().slice(0, 3000);
    if (!clean) { onState("ended"); return; }
    onState("loading");
    speakWithAliceVoice(clean, currentRun, onState).then(usedAliceVoice => {
      if (usedAliceVoice || currentRun !== run) return;
      if (!window.speechSynthesis || typeof SpeechSynthesisUtterance === "undefined") {
        activeChannel = null;
        onState("error", new Error("В этом браузере нет встроенного синтеза речи."));
        return;
      }
      availableVoices().then(voices => {
        if (currentRun !== run) return;
        const utterance = new SpeechSynthesisUtterance(clean);
        utterance.lang = "ru-RU";
        utterance.rate = 0.95;
        utterance.voice = selectRussianVoice(voices);
        utterance.onstart = () => { if (currentRun === run) onState("playing"); };
        utterance.onend = () => {
          if (currentRun !== run) return;
          activeUtterance = null;
          activeChannel = null;
          onState("ended");
        };
        utterance.onerror = event => {
          if (currentRun !== run || event.error === "canceled" || event.error === "interrupted") return;
          activeUtterance = null;
          activeChannel = null;
          onState("error", new Error("Не удалось озвучить ответ."));
        };
        activeUtterance = utterance;
        window.speechSynthesis.speak(utterance);
      });
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
    isPlaying: (channel = "") => Boolean((activeUtterance && window.speechSynthesis?.speaking) || activeAudio && !activeAudio.paused) && (!channel || activeChannel === channel),
    isEnabled: (channel = "alice") => Boolean(enabled[channel]),
    setEnabled
  };
})();
