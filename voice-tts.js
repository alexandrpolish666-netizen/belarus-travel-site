(() => {
  let generation = 0;
  let audio = null;
  let objectUrl = "";
  const requests = new Set();

  function cleanText(value) {
    return String(value)
      .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
      .replace(/https?:\/\/\S+/gi, "")
      .replace(/[`*_#>~]/g, "")
      .replace(/[\p{Extended_Pictographic}\p{Emoji_Modifier}\p{Regional_Indicator}\uFE0F\u200D]/gu, " ")
      .replace(/[ \t]+/g, " ")
      .replace(/\s*\n+\s*/g, ". ")
      .replace(/\s+([,.!?;:])/g, "$1")
      .replace(/([.!?])(?=\S)/g, "$1 ")
      .replace(/\s{2,}/g, " ")
      .trim();
  }

  function splitText(text) {
    const sentences = text.match(/[^.!?\u2026]+[.!?\u2026]+|[^.!?\u2026]+$/g) || [text];
    const pieces = [];
    for (const sentence of sentences) {
      let rest = sentence.trim();
      while (rest.length > 220) {
        let cut = rest.lastIndexOf(" ", 220);
        if (cut < 100) cut = 220;
        pieces.push(rest.slice(0, cut).trim());
        rest = rest.slice(cut).trim();
      }
      if (rest) pieces.push(rest);
    }
    return pieces;
  }

  function stop() {
    generation++;
    for (const controller of requests) controller.abort();
    requests.clear();
    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
      audio = null;
    }
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl = "";
  }

  async function getAudio(text, run) {
    const controller = new AbortController();
    requests.add(controller);
    try {
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
        signal: controller.signal
      });
      if (!response.ok) throw new Error("Voice request failed.");
      const blob = await response.blob();
      if (run !== generation) throw new DOMException("Cancelled", "AbortError");
      return blob;
    } finally {
      requests.delete(controller);
    }
  }

  function playBlob(blob, run, onState) {
    return new Promise((resolve, reject) => {
      if (run !== generation) return resolve();
      objectUrl = URL.createObjectURL(blob);
      const current = new Audio(objectUrl);
      audio = current;
      let settled = false;
      const finish = error => {
        if (settled) return;
        settled = true;
        current.onended = current.onerror = current.onpause = null;
        if (audio === current) audio = null;
        URL.revokeObjectURL(objectUrl);
        objectUrl = "";
        error ? reject(error) : resolve();
      };
      current.onended = () => finish();
      current.onerror = () => finish(new Error("Voice playback failed."));
      current.onpause = () => { if (run !== generation) finish(); };
      current.onplay = () => onState("playing");
      current.play().catch(finish);
    });
  }

  async function speak(value, onState = () => {}) {
    stop();
    const run = generation;
    const pieces = splitText(cleanText(value).slice(0, 3000));
    if (!pieces.length) {
      onState("ended");
      return;
    }

    onState("loading");
    try {
      let nextAudio = getAudio(pieces[0], run);
      for (let i = 0; i < pieces.length; i++) {
        const blob = await nextAudio;
        if (run !== generation) return;
        if (i + 1 < pieces.length) nextAudio = getAudio(pieces[i + 1], run);
        await playBlob(blob, run, onState);
      }
      if (run === generation) onState("ended");
    } catch (error) {
      if (error.name !== "AbortError" && run === generation) onState("error", error);
    } finally {
      if (run === generation) {
        if (audio) audio.pause();
        if (objectUrl) URL.revokeObjectURL(objectUrl);
        audio = null;
        objectUrl = "";
      }
    }
  }

  window.jarvisVoice = { speak, stop, isPlaying: () => Boolean(audio && !audio.paused) };
})();
