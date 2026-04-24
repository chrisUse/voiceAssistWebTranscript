import { useCallback, useRef, useState } from "react";

export type RecorderState = "idle" | "recording" | "transcribing";

export function useRecorder(onTranscript: (text: string) => void) {
  const [state, setState] = useState<RecorderState>("idle");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const start = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mimeType =
      ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/ogg"].find(
        (t) => MediaRecorder.isTypeSupported(t)
      ) || "";
    const mr = new MediaRecorder(stream, mimeType ? { mimeType } : {});
    chunksRef.current = [];
    mr.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    mr.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      setState("transcribing");
      const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
      const formData = new FormData();
      formData.append("audio", blob, "recording.webm");
      try {
        const res = await fetch("/api/transcribe/", { method: "POST", body: formData });
        if (res.ok) {
          const data = await res.json();
          if (data.text) onTranscript(data.text.trim());
        }
      } catch (err) {
        console.error("Transkription fehlgeschlagen:", err);
      } finally {
        setState("idle");
      }
    };
    mr.start(1000);
    mediaRecorderRef.current = mr;
    setState("recording");
  }, [onTranscript]);

  const stop = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
  }, []);

  const toggle = useCallback(() => {
    if (state === "idle") start();
    else if (state === "recording") stop();
  }, [state, start, stop]);

  return { state, toggle };
}
