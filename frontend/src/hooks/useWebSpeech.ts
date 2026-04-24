import { useCallback, useRef, useState } from "react";
import type { RecorderState } from "./useRecorder";

export function useWebSpeech(onTranscript: (text: string) => void) {
  const [state, setState] = useState<RecorderState>("idle");
  const recogRef = useRef<SpeechRecognition | null>(null);

  const toggle = useCallback(() => {
    if (state === "recording") {
      recogRef.current?.stop();
      return;
    }

    const SR =
      window.SpeechRecognition ?? (window as Window & { webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition;
    if (!SR) {
      alert("Web Speech API nicht verfügbar. Bitte Chrome oder Edge verwenden.");
      return;
    }

    const recognition = new SR();
    recognition.lang = "de-DE";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setState("recording");
    recognition.onspeechend = () => setState("transcribing");
    recognition.onresult = (e) => {
      const text = Array.from(e.results)
        .map((r) => r[0].transcript)
        .join(" ")
        .trim();
      if (text) onTranscript(text);
    };
    recognition.onerror = (e) => {
      console.error("Speech recognition error:", e.error);
    };
    recognition.onend = () => {
      setState("idle");
      recogRef.current = null;
    };

    recognition.start();
    recogRef.current = recognition;
  }, [state, onTranscript]);

  return { state, toggle };
}
