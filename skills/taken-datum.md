---
name: taken-datum
description: Toon alle taken voor een specifieke datum uit de Huis app
triggers:
  - taken op
  - taken voor datum
  - wat moet er op
---

# Taken voor een datum ophalen

Haal de taken voor een specifieke datum op uit de Huis API.

## Argumenten

De gebruiker geeft een datum mee. Accepteer formaten als `2026-05-05`, `morgen`, `overmorgen`, `maandag`, etc. Vertaal naar `YYYY-MM-DD`.

## Stappen

1. Lees de configuratie uit `skills/config.json` (relatief aan de project root). Dit bevat `baseUrl` en `token`.
2. Vertaal het datum-argument naar `YYYY-MM-DD` formaat.
3. Doe een GET request naar `{baseUrl}/api/tasks?from={datum}&to={datum}` met header `Authorization: Bearer {token}`.
4. Toon de taken als een overzichtelijke lijst.

## Output formaat

Toon de datum bovenaan, en per taak:
- Titel
- Toegewezen aan (naam)
- Categorie (als aanwezig)
- Status: afgerond of open
- Notities (als aanwezig)

Als er geen taken zijn voor die datum, meld dit.

Geef het resultaat in het Nederlands.
