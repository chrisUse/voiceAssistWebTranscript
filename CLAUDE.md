# Voice Dictation Web App

Sprachgesteuerte Diktierlösung: Audio aufnehmen → transkribieren → als Dokument speichern.

## Architektur

Drei Docker-Services, vollständig self-contained:

```
Browser → Frontend (Vite/React :5173)
              ↓ /api/*
         Backend (FastAPI :8000)
              ↓ /transcribe
         Whisper (faster-whisper :8001)
```

## Services

### whisper/
- `faster-whisper` REST-Service, exponiert `/transcribe`
- Nimmt WAV 16kHz mono entgegen, gibt `{"text": "..."}` zurück
- Modell konfigurierbar via `WHISPER_MODEL` (tiny/base/small/medium/large-v3)
- Modell-Cache im Docker-Volume `whisper-models` (HuggingFace, wird beim ersten Start geladen)

### backend/
- FastAPI mit SQLite (Volume `backend-data`)
- `/api/transcribe/` – konvertiert Audio via ffmpeg → WAV, leitet an Whisper weiter
- `/api/docs/` – CRUD für Dokumente + `/api/docs/{id}/export` als .txt-Download
- Config via `.env`: `WHISPER_URL`, `WHISPER_LANGUAGE`

### frontend/
- React + Vite, Dev-Target mit Hot Reload
- Zwei STT-Provider umschaltbar (gespeichert in localStorage):
  - **Google** (Standard): Browser-native `SpeechRecognition` API, Audio geht direkt an Googles Server, kein API-Key, nur Chrome/Edge, braucht HTTPS oder localhost
  - **Whisper**: `MediaRecorder` → Backend → Whisper-Container, funktioniert offline
- Ctrl+S speichert das aktive Dokument

## Starten

```bash
cp .env.example .env          # einmalig: Konfiguration anlegen
docker compose up --build     # erster Start (Modell wird heruntergeladen)
docker compose up             # danach
```

Frontend: http://localhost:3005  
Backend API: http://localhost:8011

## Ports (docker-compose.yml)

| Service  | Intern | Extern |
|----------|--------|--------|
| whisper  | 8001   | —      |
| backend  | 8000   | 8011   |
| frontend | 5173   | 3005   |

## Produktion

```yaml
# docker-compose.yml: frontend target auf prod setzen
target: prod
ports:
  - "80:80"
```

Das prod-Target baut einen nginx-Container mit dem statischen Vite-Build.
Für Google Web Speech API ist HTTPS erforderlich (nicht localhost).

## Whisper-Modell wechseln

In `docker-compose.yml`:
```yaml
environment:
  - WHISPER_MODEL=small    # besser für Deutsch
  - WHISPER_MODEL=medium   # sehr gut, aber langsamer auf CPU
```

Nach Änderung: `docker compose up -d --build whisper`

## Wichtige Dateien

- `frontend/src/hooks/useRecorder.ts` – Whisper-Pfad (MediaRecorder → Backend)
- `frontend/src/hooks/useWebSpeech.ts` – Google-Pfad (SpeechRecognition API)
- `backend/app/routers/transcribe.py` – ffmpeg-Konvertierung + Whisper-Forwarding
- `backend/app/routers/docs.py` – Dokument-CRUD + .txt-Export
- `whisper/app.py` – faster-whisper FastAPI-Service
