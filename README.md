# Taken

Een self-hosted huishoudtaken app met weekplanning, herhalende taken en maaltijdplanning. UI volledig in het Nederlands.

---

## Technische Stack

- **Frontend**: React 18 + Vite + Tailwind CSS
- **Backend**: Express.js (Node)
- **Database**: SQLite (better-sqlite3)
- **Infra**: Docker, GHCR (`ghcr.io/niekp/taken`)
- **Auth**: PIN-based login
- **PWA**: Installeerbaar op mobiel (vite-plugin-pwa)

---

## Snel starten

### Docker (productie)

```bash
docker compose -f docker-compose.prod.yml up -d
```

De app draait op `http://localhost:3000`. Data wordt opgeslagen in `./data/chores.db`.

### Docker (development)

```bash
docker compose up --watch
```

Wijzigingen in `server/` en `src/` worden automatisch gesynchroniseerd.

### Lokaal (zonder Docker)

```bash
npm install
# Terminal 1: backend
npm run dev:server
# Terminal 2: frontend (Vite dev server op :5173, proxied naar :3000)
npm run dev
```

### Gebruikers beheren

```bash
# Lokaal
npm run cli

# Via Docker
./manage.sh
```

De CLI/manage.sh biedt opties om gebruikers toe te voegen, te verwijderen en PINs te resetten.

---

## Project Structuur

```
taken/
├── server/
│   ├── index.js              # Express app (API + SPA serving)
│   ├── routes.js             # Route wiring
│   ├── db.js                 # SQLite init + migration runner
│   ├── cli.js                # CLI voor gebruikersbeheer
│   ├── controllers/
│   │   ├── taskController.js
│   │   ├── completedTaskController.js
│   │   ├── intervalTaskController.js
│   │   ├── mealController.js
│   │   └── userController.js
│   ├── repositories/
│   │   ├── taskRepository.js
│   │   ├── completedTaskRepository.js
│   │   ├── intervalTaskRepository.js
│   │   ├── mealRepository.js
│   │   └── userRepository.js
│   └── migrations/
│       ├── 001-initial-schema.js
│       ├── 002-add-user-color.js
│       ├── 003-interval-tasks.js
│       └── 004-remove-is-recurring.js
├── src/
│   ├── App.jsx               # Root met tab-navigatie
│   ├── components/
│   │   ├── WeekView.jsx      # Weekoverzicht (hoofd scherm)
│   │   ├── TaskItem.jsx      # Taak component
│   │   ├── TaskModal.jsx     # Taak toevoegen/bewerken
│   │   ├── IntervalTasksView.jsx  # Herhalende taken panel
│   │   ├── IntervalTaskModal.jsx  # Herhalende taak modal
│   │   ├── Login.jsx         # PIN login
│   │   ├── Menu.jsx          # Hamburger menu
│   │   ├── Stats.jsx         # Statistieken
│   │   └── Confetti.jsx      # Animatie bij voltooiing
│   ├── lib/
│   │   ├── api.js            # API client
│   │   └── colors.js         # Kleurenpalet
│   ├── main.jsx
│   └── index.css
├── Dockerfile                # Multi-stage build
├── docker-compose.yml        # Dev (met watch)
├── docker-compose.prod.yml   # Productie (GHCR image)
├── manage.sh                 # Bash TUI voor containerbeheer
├── package.json
├── vite.config.js
└── tailwind.config.js
```

---

## Database Schema (SQLite)

### `users`
| Kolom | Type | Beschrijving |
|-------|------|--------------|
| id | INTEGER | Primary key (autoincrement) |
| name | TEXT | Gebruikersnaam |
| pin | TEXT | PIN code |
| avatar_url | TEXT | Profielfoto URL (optioneel) |
| color | TEXT | Kleur key (`blue`, `pink`, `green`, `purple`, `orange`, `red`, `teal`, `yellow`) |
| created_at | TEXT | Aangemaakt op |

### `tasks` (weektaken / schema's)
| Kolom | Type | Beschrijving |
|-------|------|--------------|
| id | INTEGER | Primary key |
| title | TEXT | Taak titel |
| day_of_week | INTEGER | 0=ma, 6=zo |
| assigned_to | INTEGER | FK naar users.id |
| is_both | INTEGER | Samen doen (0/1) |
| created_by | INTEGER | FK naar users.id |
| created_at | TEXT | Aangemaakt op |

Alle weektaken herhalen automatisch elke week. Niet-voltooide taken verschuiven naar vandaag met een "achterstallig" badge.

### `completed_tasks`
| Kolom | Type | Beschrijving |
|-------|------|--------------|
| id | INTEGER | Primary key |
| task_id | INTEGER | FK naar tasks.id |
| user_id | INTEGER | FK naar users.id |
| week_number | INTEGER | ISO weeknummer |
| year | INTEGER | Jaar |
| completed_at | TEXT | Wanneer voltooid |

### `interval_tasks` (herhalende taken)
| Kolom | Type | Beschrijving |
|-------|------|--------------|
| id | INTEGER | Primary key |
| title | TEXT | Taak titel |
| category | TEXT | Categorie |
| interval_days | INTEGER | Interval in dagen |
| assigned_to | INTEGER | FK naar users.id (optioneel) |
| created_at | TEXT | Aangemaakt op |

### `interval_completions`
| Kolom | Type | Beschrijving |
|-------|------|--------------|
| id | INTEGER | Primary key |
| task_id | INTEGER | FK naar interval_tasks.id |
| user_id | INTEGER | FK naar users.id |
| completed_at | TEXT | Wanneer voltooid |

### `meals`
| Kolom | Type | Beschrijving |
|-------|------|--------------|
| id | INTEGER | Primary key |
| day_of_week | INTEGER | 0=ma, 6=zo |
| meal_name | TEXT | Naam van het eten |
| meal_type | TEXT | `lunch` of `dinner` |
| week_number | INTEGER | Weeknummer |
| year | INTEGER | Jaar |
| created_at | TEXT | Aangemaakt op |

---

## Concepten

### Weektaken (schema's)
Taken worden ingesteld op een vaste dag van de week en herhalen automatisch elke week. Het voltooien wordt bijgehouden per week via `completed_tasks` (gebaseerd op `task_id + week_number + year`). Als een taak niet is voltooid en de dag is verstreken (in de huidige week), verschijnt de taak bij vandaag met een "X dagen achterstallig" badge.

### Herhalende taken (interval)
Taken met een vast interval (bijv. elke 14 dagen). De vervaldatum wordt berekend als `laatste_voltooiing + interval_days`. Status: achterstallig (rood), vandaag (oranje), of gepland (grijs). Deze taken worden beheerd in het "Herhalend" tabblad, maar verschijnen ook in het weekoverzicht op hun vervaldatum.

### Kleuren
Elke gebruiker heeft een kleur uit een vast palet. Kleuren worden gebruikt in de UI voor taaktoewijzing en filters. De beschikbare kleuren: `blue`, `pink`, `green`, `purple`, `orange`, `red`, `teal`, `yellow`.

---

## Gebruik

1. Open de app en voer je PIN in
2. Navigeer tussen dagen in het weekoverzicht
3. Tik op "+" om een taak of maaltijd toe te voegen
4. Tik op een taak om af te vinken (met confetti)
5. Swipe naar links om te verwijderen
6. Wissel naar "Herhalend" voor interval-taken
7. Gebruik het menu voor statistieken en presentatiemodus

### Presentatiemodus
Voeg `?mode=presentation` toe aan de URL voor een week-overzicht op groot scherm. Beschikbaar via het menu.

### PWA
Op mobiel installeerbaar:
- **iOS**: Safari > Delen > "Zet op beginscherm"
- **Android**: Chrome > Menu > "App installeren"

---

## Features

- Weektaken met automatische herhaling
- Achterstallige taken verschuiven naar vandaag
- Herhalende taken met instelbaar interval
- Maaltijdplanning (lunch/diner per dag)
- Taken toewijzen aan gebruikers of "samen"
- PIN-based login
- Confetti animatie bij voltooiing
- Statistieken (week/maand/jaar/alle tijden)
- Presentatiemodus (groot scherm)
- Swipe-to-delete
- PWA met auto-update
- Profielfoto's
- Gebruikerskleuren
- Docker deployment via GHCR
