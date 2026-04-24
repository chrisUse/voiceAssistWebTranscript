# Voice Dictation Web App

A Docker-based voice dictation web app. Record audio → transcribe automatically → save and export as documents.

## Features

- **Two switchable STT providers:**
  - **Google** (default): Browser-native Web Speech API, no API key required, Chrome/Edge only
  - **Whisper**: Local faster-whisper container, works offline
- **Continuous recording**: Automatically restarts after each pause in speech
- **Documents**: Create, rename, edit, export as `.txt`
- Fully self-contained in Docker — no external services required

## Requirements

- Docker + Docker Compose

## Setup

```bash
cp .env.example .env
docker compose up --build
```

On first start the Whisper model is downloaded (~145 MB for `base`). Then open:

```
https://localhost:3005
```

> The browser will show a certificate warning (self-signed) — just confirm and proceed.  
> HTTPS is required for the Web Speech API.

## Services

| Service  | External | Description                        |
|----------|----------|------------------------------------|
| frontend | `3005`   | React dev server (Vite + HTTPS)    |
| backend  | `8011`   | FastAPI REST API                   |
| whisper  | —        | faster-whisper (internal only)     |

## Configuration

`.env` (copy from `.env.example`):

```env
WHISPER_URL=http://whisper:8001
WHISPER_LANGUAGE=de
```

Change the Whisper model in `docker-compose.yml`:

```yaml
environment:
  - WHISPER_MODEL=base    # tiny | base | small | medium | large-v3
```

After changing the model: `docker compose up -d --build whisper`

## Data Storage

Documents are stored in SQLite inside the Docker volume `backend-data` — persistent across restarts.

```bash
# Backup
docker exec dictation-backend cat /app/data/docs.db > backup.db

# Delete all data (removes volume)
docker compose down -v
```

## Production

Set the frontend build target to `prod` in `docker-compose.yml`:

```yaml
frontend:
  build:
    target: prod
  ports:
    - "80:80"
```

This builds an nginx container serving the static Vite build. For Google Web Speech API in production, a proper HTTPS certificate is required.
