# Voice Dictation Web App

Voice-driven dictation solution: record audio → transcribe → save as documents.

## Architecture

Three Docker services, fully self-contained:

```
Browser → Frontend (Vite/React :5173)
              ↓ /api/*
         Backend (FastAPI :8000)
              ↓ /transcribe
         Whisper (faster-whisper :8001)
```

## Services

### whisper/
- `faster-whisper` REST service, exposes `/transcribe`
- Accepts WAV 16kHz mono, returns `{"text": "..."}`
- Model configurable via `WHISPER_MODEL` env var (tiny/base/small/medium/large-v3)
- Model cache in Docker volume `whisper-models` (downloaded from HuggingFace on first start)

### backend/
- FastAPI with SQLite (volume `backend-data`)
- `/api/transcribe/` — converts audio via ffmpeg → WAV, forwards to Whisper
- `/api/docs/` — document CRUD + `/api/docs/{id}/export` as `.txt` download
- Config via `.env`: `WHISPER_URL`, `WHISPER_LANGUAGE`

### frontend/
- React + Vite, dev target with hot reload, HTTPS via self-signed cert (`@vitejs/plugin-basic-ssl`)
- Two switchable STT providers (persisted in localStorage):
  - **Google** (default): browser-native `SpeechRecognition` API, audio goes directly to Google, no API key, Chrome/Edge only, requires HTTPS
  - **Whisper**: `MediaRecorder` → backend → Whisper container, works offline
- Continuous recording mode: silence detection (Web Audio API) auto-stops and restarts Whisper segments; Google uses `recognition.continuous = true`
- Title field auto-saves on blur; Ctrl+S saves document content

## Setup

```bash
cp .env.example .env          # once: create config file
docker compose up --build     # first start (model download)
docker compose up             # subsequent starts
```

Frontend: https://localhost:3005  
Backend API: http://localhost:8011

## Ports (docker-compose.yml)

| Service  | Internal | External |
|----------|----------|----------|
| whisper  | 8001     | —        |
| backend  | 8000     | 8011     |
| frontend | 5173     | 3005     |

## Production

Set the frontend target to `prod` in `docker-compose.yml`:

```yaml
target: prod
ports:
  - "80:80"
```

Builds an nginx container with the static Vite bundle.  
Google Web Speech API requires a proper HTTPS certificate in production.

## Changing the Whisper Model

In `docker-compose.yml`:
```yaml
environment:
  - WHISPER_MODEL=small    # better German accuracy
  - WHISPER_MODEL=medium   # very good, but slower on CPU
```

Then rebuild: `docker compose up -d --build whisper`

## Key Files

- `frontend/src/hooks/useRecorder.ts` — Whisper path (MediaRecorder + silence detection)
- `frontend/src/hooks/useWebSpeech.ts` — Google path (SpeechRecognition API)
- `backend/app/routers/transcribe.py` — ffmpeg conversion + Whisper forwarding
- `backend/app/routers/docs.py` — document CRUD + .txt export
- `whisper/app.py` — faster-whisper FastAPI service
