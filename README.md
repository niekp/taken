# Taken

Self-hosted huishoud app.

**Stack**: React + Vite + Tailwind CSS, Express.js, SQLite, Docker

## Starten

### Docker

```bash
# Productie
docker compose -f docker-compose.prod.yml up -d

# Development (met file watching)
docker compose up --watch
```

### Lokaal

```bash
npm install
npm run dev:server   # Backend op :3000
npm run dev          # Frontend op :5173 (proxy naar :3000)
```

De app draait op `http://localhost:3000`. Data in `./data/chores.db`.

## Gebruikers beheren

```bash
npm run cli          # Lokaal
./manage.sh          # Via Docker (TUI)
```

## Hoe het werkt

- **Schema's** — herhalende taken met een interval in dagen en toewijzing aan een gebruiker
- **Taken** — concrete instanties op een datum, aangemaakt vanuit een schema of handmatig (eenmalig)
- **Maaltijden** — avondeten per dag, beheerd in het "Eten" tabblad

Bij het voltooien van een taak met een schema wordt automatisch de volgende taak gegenereerd. Achterstallige taken verschuiven naar vandaag.

## Features

- Weekoverzicht met dag-navigatie
- Herhalende taken via schema's (instelbaar interval)
- Eenmalige taken
- Maaltijdplanning (7 dagen vooruit)
- Presentatiemodus voor groot scherm
- PIN login, gebruikerskleuren, profielfoto's
- Statistieken en geschiedenis
- Swipe-to-delete, confetti bij voltooiing
- PWA (installeerbaar op mobiel)
- Docker deployment via GHCR (`ghcr.io/niekp/taken`)
