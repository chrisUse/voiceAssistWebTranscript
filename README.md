# Voice Dictation Web App

Sprachgesteuerte Diktierlösung als Docker-Web-App. Audio aufnehmen → automatisch transkribieren → als Dokument speichern und exportieren.

## Features

- **Zwei STT-Provider** umschaltbar:
  - **Google** (Standard): Browser-native Web Speech API, kein API-Key, nur Chrome/Edge
  - **Whisper**: Lokaler faster-whisper Container, funktioniert offline
- **Daueraufnahme**: Automatischer Neustart nach jeder Sprechpause
- **Dokumente**: Anlegen, umbenennen, bearbeiten, als `.txt` exportieren
- Vollständig self-contained in Docker — keine externen Dienste nötig

## Voraussetzungen

- Docker + Docker Compose

## Setup

```bash
cp .env.example .env
docker compose up --build
```

Beim ersten Start wird das Whisper-Modell heruntergeladen (~145 MB für `base`). Danach:

```
https://localhost:3005
```

> Der Browser zeigt eine Zertifikatswarnung (selbstsigniert) — einfach bestätigen.  
> HTTPS ist für die Web Speech API erforderlich.

## Dienste

| Service  | Extern  | Beschreibung                        |
|----------|---------|-------------------------------------|
| frontend | `3005`  | React Dev-Server (Vite + HTTPS)     |
| backend  | `8011`  | FastAPI REST API                    |
| whisper  | —       | faster-whisper (nur intern)         |

## Konfiguration

`.env` (aus `.env.example` kopieren):

```env
WHISPER_URL=http://whisper:8001
WHISPER_LANGUAGE=de
```

Whisper-Modell in `docker-compose.yml` ändern:

```yaml
environment:
  - WHISPER_MODEL=base    # tiny | base | small | medium | large-v3
```

Nach Modelländerung: `docker compose up -d --build whisper`

## Datenspeicherung

Dokumente liegen in SQLite im Docker-Volume `backend-data` — persistent über Neustarts.

```bash
# Backup
docker exec dictation-backend cat /app/data/docs.db > backup.db

# Daten löschen (Volume entfernen)
docker compose down -v
```

## Produktion

In `docker-compose.yml` das Frontend-Target auf `prod` setzen:

```yaml
frontend:
  build:
    target: prod
  ports:
    - "80:80"
```

Baut einen nginx-Container mit statischem Vite-Build. Für Google Web Speech API eigenes HTTPS-Zertifikat einrichten.
