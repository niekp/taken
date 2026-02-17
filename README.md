# Divide/Chores 🏠

Een takenlijst app voor het huishouden van Bijan en Esther.

---

## Live URL

**https://bijanamirhojat.github.io/divide-chores/**

---

## Technische Stack

- **Frontend**: React 18 + Vite
- **Styling**: Tailwind CSS
- **Backend/DB**: Supabase (PostgreSQL)
- **Auth**: PIN-based (gedeeld)
- **Hosting**: GitHub Pages

---

## Project Structuur

```
divide-chores/
├── src/
│   ├── components/
│   │   ├── Login.jsx       # PIN login + naam selectie
│   │   ├── WeekView.jsx    # Hoofdscherm met week/dag view
│   │   ├── TaskItem.jsx    # individuele taak component
│   │   ├── TaskModal.jsx   # Modal om taken toe te voegen
│   │   ├── Menu.jsx        # Menu met history
│   │   └── Confetti.jsx    # Animatie bij afronden taak
│   ├── lib/
│   │   └── supabase.js     # Supabase client
│   ├── App.jsx             # Hoofdcomponent
│   ├── main.jsx            # Entry point
│   └── index.css           # Tailwind imports
├── public/
│   └── favicon.svg
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
└── postcss.config.js
```

---

## Database Schema (Supabase)

### `users` tabel
| Kolom | Type | Beschrijving |
|-------|------|--------------|
| id | UUID | Primary key |
| pin | TEXT | PIN code |
| name | TEXT | Naam (Bijan/Esther) |
| created_at | TIMESTAMP | Created at |

### `tasks` tabel
| Kolom | Type | Beschrijving |
|-------|------|--------------|
| id | UUID | Primary key |
| title | TEXT | Taak titel |
| description | TEXT | Optionele beschrijving |
| day_of_week | INTEGER | 0=ma, 6=zo |
| assigned_to | UUID | FK naar users.id |
| is_both | BOOLEAN | Samen doen |
| is_recurring | BOOLEAN | Wekelijks herhalen |
| created_by | UUID | FK naar users.id |
| created_at | TIMESTAMP | Created at |

### `completed_tasks` tabel
| Kolom | Type | Beschrijving |
|-------|------|--------------|
| id | UUID | Primary key |
| task_id | UUID | FK naar tasks.id |
| user_id | UUID | FK naar users.id |
| completed_at | TIMESTAMP | Wanneer voltooid |
| week_number | INTEGER | Weeknummer |
| year | INTEGER | Jaar |

---

## Hoe te Draaien

### Lokaal Ontwikkelen

```bash
cd divide-chores
npm install
npm run dev
```

Dit start de dev server op http://localhost:5173

### Bouwen voor Productie

```bash
npm run build
```

Dit maakt een `dist` folder die naar GitHub Pages kan worden gedeployed.

---

## Deployen naar GitHub Pages

### Optie 1: Handmatig (aanbevolen)

1. Download de project folder van GitHub
2. Run lokaal: `npm run build`
3. Pak de inhoud van de `dist` folder
4. Ga naar GitHub repo > Settings > Pages
5. Kies "Deploy from a branch" > main > /dist
6. Klik Save

### Optie 2: Automatisch (Actions)

De repo heeft een GitHub Action workflow die automatisch bouwt bij elke push naar main.

---

## Supabase Config

**Project URL**: `https://beovxcpqruwxznrbtmxs.supabase.co`

**Anon Key**: (zie .env bestand)

### Gebruikers toevoegen via SQL

```sql
INSERT INTO users (pin, name) VALUES 
  ('1234', 'Bijan'),
  ('1234', 'Esther');
```

### PIN wijzigen

```sql
UPDATE users SET pin = 'nieuwe_pin' WHERE name = 'Bijan';
```

---

## Gebruik van de App

1. Open de URL
2. Voer PIN in: **1234**
3. Selecteer je naam (Bijan of Esther)
4. Navigeer tussen dagen met swipe of pijltjes
5. Tik op "+" om taak toe te voegen
6. Tik op een taak om af te vinken (met geluid + animatie)
7. Gebruik het menu (hamburger linksboven) voor:
   - Voltooide taken history
   - Presentatie modus (week view op groot scherm)
   - Uitloggen

---

## Features

- ✅ Mobile-first design (1 dag tegelijk op mobiel)
- ✅ Week view in presentatie modus
- ✅ Taken toewijzen aan Bijan, Esther, of samen
- ✅ Repeterende taken (wekelijks)
- ✅ Geluid + animatie bij afronden taak
- ✅ Filter op persoon
- ✅ Indicator 🔔 bij dagen met taken (niet vandaag)
- ✅ Voltooide taken history
- ✅ Presentatie modus voor groter scherm

---

## Troubleshooting

### App laadt niet na deploy
- Wacht 1-2 minuten tot GitHub Pages klaar is met bouwen
- Check of de `dist` folder correct is gedeployed

### Database problemen
- Ga naar Supabase dashboard > Table Editor
- Check of de tabellen correct zijn aangemaakt

###PIN werkt niet
- Controleer of gebruikers bestaan in Supabase:
  ```sql
  SELECT * FROM users;
  ```

---

## Versie History

- **v1.0** (feb 2026): Initiele release
  - PIN login
  - Week/dag view
  - Taak toewijzing
  - Confetti/geluid (later vereenvoudigd)
