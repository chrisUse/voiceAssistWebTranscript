from fastapi import APIRouter, UploadFile, File, Query
from fastapi.responses import JSONResponse
import httpx
import subprocess
import tempfile
import os
from app.config import settings

router = APIRouter(prefix="/transcribe", tags=["transcribe"])

INITIAL_PROMPT = (
    "Dies ist eine Diktat-Aufnahme für technische Dokumentation. "
    "Fachbegriffe, Code-Namen, Produktnamen und technische Ausdrücke werden korrekt erkannt."
)


def _to_wav(data: bytes) -> bytes:
    with tempfile.NamedTemporaryFile(suffix=".input", delete=False) as src:
        src.write(data)
        src_path = src.name
    dst_path = src_path + ".wav"
    try:
        subprocess.run(
            ["ffmpeg", "-y", "-i", src_path, "-ar", "16000", "-ac", "1", "-f", "wav", dst_path],
            capture_output=True,
            check=True,
        )
        with open(dst_path, "rb") as f:
            return f.read()
    finally:
        os.unlink(src_path)
        if os.path.exists(dst_path):
            os.unlink(dst_path)


@router.post("/")
async def transcribe(
    audio: UploadFile = File(...),
    prompt: str = Query(default=""),
):
    content = await audio.read()
    wav = _to_wav(content)
    async with httpx.AsyncClient() as client:
        r = await client.post(
            f"{settings.whisper_url}/transcribe",
            files={"audio": ("audio.wav", wav, "audio/wav")},
            params={
                "language": settings.whisper_language,
                "initial_prompt": (prompt + " " + INITIAL_PROMPT).strip(),
            },
            timeout=30.0,
        )
    if r.status_code != 200:
        return JSONResponse(status_code=502, content={"error": r.text})
    return {"text": r.json().get("text", "")}
