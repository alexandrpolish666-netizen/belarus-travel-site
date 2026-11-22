(() => {
  let run = 0;
  let activeUtterance = null;
  const enabledKey = "alice-speak-replies";
  let enabled = localStorage.getItem(enabledKey) === "true";

  function stop() {
    run++;
    activeUtterance = null;
    window.speechSynthesis?.cancel();
  }

  function speak(text, onState = () => {}) {
    stop();
    const currentRun = run;
    const clean = String(text || "").replace(/https?:\/\/\S+/gi, "").replace(/\s+/g, " ").trim().slice(0, 3000);
    if (!clean) { onState("ended"); return; }
    if (!window.speechSynthesis || typeof SpeechSynthesisUtterance === "undefined") {
      onState("error", new Error("В этом браузере нет встроенного синтеза речи."));
      return;
    }
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.lang = "ru-RU";
    utterance.rate = 1;
    const russianVoice = window.speechSynthesis.getVoices().find(voice => /^ru(?:-|$)/i.test(voice.lang));
    if (russianVoice) utterance.voice = russianVoice;
    utterance.onstart = () => { if (currentRun === run) onState("playing"); };
    utterance.onend = () => {
      if (currentRun !== run) return;
      activeUtterance = null;
      onState("ended");
    };
    utterance.onerror = event => {
      if (currentRun !== run || event.error === "canceled" || event.error === "interrupted") return;
      activeUtterance = null;
      onState("error", new Error("Не удалось озвучить ответ."));
    };
    activeUtterance = utterance;
    onState("loading");
    window.speechSynthesis.speak(utterance);
  }

  function setEnabled(value) {
    enabled = Boolean(value);
    localStorage.setItem(enabledKey, String(enabled));
    window.dispatchEvent(new CustomEvent("alice-voice-setting", { detail: { enabled } }));
    if (!enabled) stop();
  }

  window.jarvisVoice = {
    speak,
    stop,
    isPlaying: () => Boolean(activeUtterance && window.speechSynthesis?.speaking),
    isEnabled: () => enabled,
    setEnabled
  };
})();
