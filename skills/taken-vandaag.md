---
name: taken-vandaag
description: Toon alle taken voor vandaag uit de Huis app
triggers:
  - taken vandaag
  - wat moet er vandaag
  - taken voor vandaag
---

# Taken vandaag ophalen

Haal de taken voor vandaag op uit de Huis API.

## Stappen

1. Lees de configuratie uit `skills/config.json` (relatief aan de project root). Dit bevat `baseUrl` en `token`.
2. Bepaal de datum van vandaag in `YYYY-MM-DD` formaat.
3. Doe een GET request naar `{baseUrl}/api/tasks?from={datum}&to={datum}` met header `Authorization: Bearer {token}`.
4. Toon de taken als een overzichtelijke lijst.

## Output formaat

Toon per taak:
- Titel
- Toegewezen aan (naam)
- Categorie (als aanwezig)
- Status: afgerond of open
- Notities (als aanwezig)

Als er geen taken zijn, meld dat het een vrije dag is.

Geef het resultaat in het Nederlands.
