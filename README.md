# Divide/Chores 🏠

Een takenlijst app voor jullie huishouden.

## Features

- 📱 Mobile-first design - werkt perfect op iPhone
- 🔐 PIN login (gedeeld, selecteer daarna je naam)
- 📅 Week view met swipe navigatie
- 👥 Taken toewijzen aan Bijan, Esther, of samen
- 🔄 Repeterende taken
- 🎉 Confetti + geluid bij afronden taak
- 🔔 Indicator bij dagen met taken
- 🖥️ Presentatie modus voor groter scherm
- ✅ Voltooide taken history

## Setup

1. **Installeer dependencies:**
   ```bash
   cd divide-chores
   npm install
   ```

2. **Start development server:**
   ```bash
   npm run dev
   ```

3. **Open** http://localhost:5173

## Bouwen voor productie

```bash
npm run build
```

## Deploy naar GitHub Pages

1. Push naar GitHub
2. Ga naar Settings > Pages
3. Select "Deploy from main branch"
4. De app wordt live op: https://bijanamirhojat.github.io/divide-chores/

## Database

De app gebruikt Supabase. De database is al ingesteld met:
- 2 gebruikers (Bijan en Esther)
- PIN: 1234

### Database wijzigen

Ga naar je Supabase dashboard > SQL Editor om queries uit te voeren.

## Gebruik

1. Voer PIN in: **1234**
2. Selecteer je naam (Bijan of Esther)
3. Bekijk de week en swipe links/rechts voor andere weken
4. Tik op "+" om een taak toe te voegen
5. Tik op een taak om deze af te vinken (met confetti!)
6. Gebruik het menu voor history en presentatie modus
