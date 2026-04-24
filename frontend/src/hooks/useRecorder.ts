import { useCallback, useRef, useState } from "react";

export type RecorderState = "idle" | "recording" | "transcribing";

const SILENCE_THRESHOLD = 15;
const SILENCE_DELAY = 1200;
const MIN_RECORDING = 600;

export function useRecorder(onTranscript: (text: string) => void, continuous: boolean) {
  const [state, setState] = useState<RecorderState>("idle");
  const activeRef = useRef(false);
  const mrRef = useRef<MediaRecorder | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onTranscriptRef = useRef(onTranscript);
  onTranscriptRef.current = onTranscript;
  const continuousRef = useRef(continuous);
  continuousRef.current = continuous;

  const doRecord = useCallback(async () => {
    if (!activeRef.current) return;

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      activeRef.current = false;
      setState("idle");
      return;
    }

    const mimeType =
      ["audio/webm;codecs=opus", "audio/webm", "audio/ogg"].find((t) =>
        MediaRecorder.isTypeSupported(t)
      ) || "";
    const mr = new MediaRecorder(stream, mimeType ? { mimeType } : {});
    const chunks: Blob[] = [];

    mr.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    mr.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      audioCtxRef.current?.close();
      audioCtxRef.current = null;
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }

      setState("transcribing");
      const blob = new Blob(chunks, { type: mr.mimeType || "audio/webm" });
      const fd = new FormData();
      fd.append("audio", blob, "recording.webm");

      try {
        const res = await fetch("/api/transcribe/", { method: "POST", body: fd });
        if (res.ok) {
          const data = await res.json();
          if (data.text) onTranscriptRef.current(data.text.trim());
        }
      } catch (err) {
        console.error("Transkription fehlgeschlagen:", err);
      }

      if (continuousRef.current && activeRef.current) {
        doRecord();
      } else {
        activeRef.current = false;
        setState("idle");
      }
    };

    mr.start(1000);
    mrRef.current = mr;
    setState("recording");

    // Stille-Erkennung für Daueraufnahme
    if (continuousRef.current) {
      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      audioCtx.createMediaStreamSource(stream).connect(analyser);
      const freqData = new Uint8Array(analyser.frequencyBinCount);
      const startTime = Date.now();

      const tick = () => {
        if (mr.state !== "recording") return;
        analyser.getByteFrequencyData(freqData);
        const vol = freqData.reduce((a, b) => a + b, 0) / freqData.length;

        if (vol > SILENCE_THRESHOLD) {
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
          }
        } else if (!silenceTimerRef.current && Date.now() - startTime > MIN_RECORDING) {
          silenceTimerRef.current = setTimeout(() => {
            if (mr.state === "recording") mr.stop();
          }, SILENCE_DELAY);
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }
  }, []); // verwendet nur Refs, keine deps nötig

  const start = useCallback(() => {
    activeRef.current = true;
    doRecord();
  }, [doRecord]);

  const stop = useCallback(() => {
    activeRef.current = false;
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    audioCtxRef.current?.close();
    audioCtxRef.current = null;
    if (mrRef.current?.state === "recording") {
      mrRef.current.stop();
    } else {
      setState("idle");
    }
    mrRef.current = null;
  }, []);

  const toggle = useCallback(() => {
    if (state === "idle") start();
    else stop();
  }, [state, start, stop]);

  return { state, toggle };
}
