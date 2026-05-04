---
name: taak-toevoegen
description: Voeg een eenmalige taak toe aan de Huis app
triggers:
  - taak toevoegen
  - nieuwe taak
  - voeg taak toe
---

# Taak toevoegen

Voeg een eenmalige (niet-herhalende) taak toe aan de Huis app.

## Argumenten

De gebruiker geeft minimaal een titel mee, en optioneel:
- **datum**: standaard vandaag. Accepteer formaten als `2026-05-05`, `morgen`, `overmorgen`, `maandag`, etc.

## Stappen

1. Lees de configuratie uit `skills/config.json` (relatief aan de project root). Dit bevat `baseUrl` en `token`.
2. Vertaal de datum naar `YYYY-MM-DD` formaat (standaard: vandaag).
3. Doe een POST request naar `{baseUrl}/api/tasks` met header `Authorization: Bearer {token}` en body:
   ```json
   {
     "title": "<titel>",
     "date": "<YYYY-MM-DD>"
   }
   ```
4. Bevestig dat de taak is aangemaakt.

## Output formaat

Bevestig de aangemaakte taak met:
- Titel
- Datum

Geef het resultaat in het Nederlands.
