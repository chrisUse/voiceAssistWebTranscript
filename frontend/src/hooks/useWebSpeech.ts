import { useCallback, useRef, useState } from "react";
import type { RecorderState } from "./useRecorder";

export function useWebSpeech(onTranscript: (text: string) => void, continuous: boolean) {
  const [state, setState] = useState<RecorderState>("idle");
  const recogRef = useRef<SpeechRecognition | null>(null);
  const activeRef = useRef(false);
  const onTranscriptRef = useRef(onTranscript);
  onTranscriptRef.current = onTranscript;
  const continuousRef = useRef(continuous);
  continuousRef.current = continuous;

  const toggle = useCallback(() => {
    if (state !== "idle") {
      activeRef.current = false;
      recogRef.current?.stop();
      recogRef.current = null;
      setState("idle");
      return;
    }

    const SR =
      window.SpeechRecognition ??
      (window as Window & { webkitSpeechRecognition?: typeof SpeechRecognition })
        .webkitSpeechRecognition;
    if (!SR) {
      alert("Web Speech API nicht verfügbar. Bitte Chrome oder Edge verwenden.");
      return;
    }

    activeRef.current = true;
    const recognition = new SR();
    recognition.lang = "de-DE";
    recognition.continuous = continuousRef.current;
    recognition.interimResults = false;

    recognition.onstart = () => setState("recording");

    recognition.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          const text = e.results[i][0].transcript.trim();
          if (text) onTranscriptRef.current(text);
        }
      }
    };

    recognition.onspeechend = () => {
      if (!continuousRef.current) setState("transcribing");
    };

    recognition.onerror = (e) => {
      if (e.error !== "aborted") console.error("Speech recognition error:", e.error);
    };

    recognition.onend = () => {
      // Daueraufnahme: bei unerwartetem Ende neu starten
      if (activeRef.current && continuousRef.current) {
        try {
          recognition.start();
        } catch {
          activeRef.current = false;
          setState("idle");
        }
      } else {
        activeRef.current = false;
        recogRef.current = null;
        setState("idle");
      }
    };

    recognition.start();
    recogRef.current = recognition;
  }, [state]);

  return { state, toggle };
}
