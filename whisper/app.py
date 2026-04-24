import os
import tempfile
from fastapi import FastAPI, UploadFile, File, Query
from faster_whisper import WhisperModel

app = FastAPI(title="Whisper ASR Service")

MODEL_NAME = os.getenv("WHISPER_MODEL", "base")
_model: WhisperModel | None = None


def get_model() -> WhisperModel:
    global _model
    if _model is None:
        print(f"Lade Whisper-Modell '{MODEL_NAME}'...", flush=True)
        _model = WhisperModel(MODEL_NAME, device="cpu", compute_type="int8")
        print("Modell geladen.", flush=True)
    return _model


@app.on_event("startup")
def load_model():
    get_model()


@app.get("/health")
def health():
    return {"status": "ok", "model": MODEL_NAME}


@app.post("/transcribe")
async def transcribe(
    audio: UploadFile = File(...),
    language: str = Query(default="de"),
    initial_prompt: str = Query(default=""),
):
    content = await audio.read()
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
        f.write(content)
        path = f.name
    try:
        model = get_model()
        segments, _ = model.transcribe(
            path,
            language=language or None,
            initial_prompt=initial_prompt or None,
            beam_size=5,
            vad_filter=True,
        )
        text = " ".join(s.text for s in segments).strip()
    finally:
        os.unlink(path)
    return {"text": text}
